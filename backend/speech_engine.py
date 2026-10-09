"""Bundled, local speech recognition; no helper Python, GPU or ffmpeg executable."""
import io
import re
import os
import ctypes
import threading
from pathlib import Path
import config

_model = None
_load_lock = threading.Lock()
_decode_lock = threading.Lock()
_error = None
_vad_model = None
_vad_lock = threading.Lock()

def detect_voice(raw):
    """Short local microphone windows; neural speech detection, not a volume gate."""
    global _vad_model
    import av
    import numpy as np
    import sherpa_onnx
    frames=[]
    with av.open(io.BytesIO(raw)) as container:
        resampler=av.AudioResampler(format='fltp',layout='mono',rate=16000)
        for frame in container.decode(audio=0):
            for f in resampler.resample(frame):frames.append(f.to_ndarray().reshape(-1))
        for f in resampler.resample(None):frames.append(f.to_ndarray().reshape(-1))
    if not frames:return False
    samples=np.concatenate(frames).astype(np.float32)
    if len(samples)>16000*2:raise ValueError('语音检测窗口过长')
    energy=float(np.sqrt(np.mean(samples*samples)))
    if energy<.00002:return False
    samples*=min(32,.08/max(.00001,energy),.95/max(.00001,float(np.max(np.abs(samples)))))
    with _vad_lock:
        if _vad_model is None:
            cfg=sherpa_onnx.VadModelConfig();cfg.silero_vad.model=str(config.BASE_DIR/'models'/'silero_vad.onnx')
            cfg.silero_vad.min_speech_duration=.09;cfg.silero_vad.min_silence_duration=.12
            _vad_model=sherpa_onnx.VoiceActivityDetector(cfg,buffer_size_in_seconds=3)
        _vad_model.reset()
        while not _vad_model.empty():_vad_model.pop()
        _vad_model.accept_waveform(samples)
        detected=_vad_model.is_speech_detected() or not _vad_model.empty()
        return bool(detected)


def load():
    global _model, _error
    if _model is not None:
        return _model
    with _load_lock:
        if _model is None:
            try:
                import sherpa_onnx
                location = config.BASE_DIR / 'models' / 'sensevoice'
                if not (location / 'model.int8.onnx').exists():
                    raise RuntimeError('安装包中的语音模型缺失，请重新安装')
                _model = sherpa_onnx.OfflineRecognizer.from_sense_voice(
                    model=str(location/'model.int8.onnx'),tokens=str(location/'tokens.txt'),
                    num_threads=2,language='zh',use_itn=True)
                _error = None
            except Exception:
                _error = '本地语音识别未能启动，请检查安装文件是否完整'
                raise
    return _model


def status():
    return {'ready': _model is not None, 'error': _error, 'engine': 'SenseVoice · 普通话本地识别', 'model':'SenseVoiceSmall int8', 'device':'CPU'}

def simplified(text):
    if not text or os.name != 'nt':
        return text
    mapper = ctypes.windll.kernel32.LCMapStringEx
    mapper.argtypes = [ctypes.c_wchar_p, ctypes.c_uint, ctypes.c_wchar_p, ctypes.c_int,
                       ctypes.c_wchar_p, ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_ssize_t]
    mapper.restype = ctypes.c_int
    size = mapper('zh-CN', 0x02000000, text, -1, None, 0, None, None, 0)
    if not size:
        return text
    buffer = ctypes.create_unicode_buffer(size)
    return buffer.value if mapper('zh-CN', 0x02000000, text, -1, buffer, size, None, None, 0) else text


def clean_transcript(text):
    text = simplified(text.strip())
    compact = re.sub(r'[\W_]+', '', text)
    # A former decoder prompt was occasionally echoed on weak/noise input.
    # Never promote this implementation text into a user turn.
    if compact in {'普通话日常对话请使用简体中文转写', '请使用简体中文转写', '普通话日常对话'}:
        return ''
    # Decoder loops on noise/silence must never become a user message.
    if re.search(r'(.{1,16}?)\1{7,}', compact):
        return ''
    return text


def transcribe(raw):
    import av
    import numpy as np
    import sherpa_onnx
    # Decode and resample locally; never upload a recording to the model service.
    frames=[]
    with av.open(io.BytesIO(raw)) as container:
        resampler=av.AudioResampler(format='fltp',layout='mono',rate=16000)
        for frame in container.decode(audio=0):
            for f in resampler.resample(frame):frames.append(f.to_ndarray().reshape(-1))
        for f in resampler.resample(None):frames.append(f.to_ndarray().reshape(-1))
    if not frames:return ''
    samples=np.concatenate(frames).astype(np.float32)
    if len(samples)>16000*35:raise ValueError('每句话最长35秒，请分句说')
    energy=float(np.sqrt(np.mean(samples*samples)))
    if energy<.00002:return ''
    # Quiet speech normalization is peak bounded and followed by neural VAD.
    gain=min(32,.08/max(.00001,energy),.95/max(.00001,float(np.max(np.abs(samples)))))
    samples=samples*gain
    model = load()
    with _decode_lock:
        vadconfig=sherpa_onnx.VadModelConfig()
        vadconfig.silero_vad.model=str(config.BASE_DIR/'models'/'silero_vad.onnx')
        vadconfig.silero_vad.min_speech_duration=.15
        vadconfig.silero_vad.min_silence_duration=.3
        vadconfig.silero_vad.max_speech_duration=35
        vad=sherpa_onnx.VoiceActivityDetector(vadconfig,buffer_size_in_seconds=40)
        vad.accept_waveform(samples);vad.flush()
        if vad.empty():return ''
        stream=model.create_stream()
        stream.accept_waveform(16000,samples)
        model.decode_stream(stream)
        return clean_transcript(stream.result.text)


def warmup():
    try:
        load()
    except Exception:
        print('[stt] local engine not ready')
