"""语音合成：edge-tts（微软在线音色），带缓存与代理"""
import hashlib
import io

import edge_tts

import config

VOICES = [
    {"id": "zh-CN-XiaoxiaoNeural", "label": "温柔甜心（女）", "gender": "f"},
    {"id": "zh-CN-XiaoyiNeural",   "label": "活泼元气（女）", "gender": "f"},
    {"id": "zh-CN-liaoning-XiaobeiNeural", "label": "俏皮东北（女）", "gender": "f"},
    {"id": "zh-HK-HiuMaanNeural",  "label": "港风粤语（女）", "gender": "f"},
    {"id": "zh-TW-HsiaoChenNeural", "label": "台湾软糯（女）", "gender": "f"},
    {"id": "zh-CN-YunxiNeural",    "label": "阳光儒雅（男）", "gender": "m"},
    {"id": "zh-CN-YunjianNeural",  "label": "低沉磁性（男）", "gender": "m"},
    {"id": "zh-CN-YunyangNeural",  "label": "稳重播报（男）", "gender": "m"},
    {"id": "zh-HK-WanLungNeural",  "label": "港风粤语（男）", "gender": "m"},
    {"id": "zh-TW-YunJheNeural",   "label": "台湾温柔（男）", "gender": "m"},
]


def synth(text: str, voice: str, rate: str = "+0%", pitch: str = "+0Hz") -> bytes | None:
    key = hashlib.md5(f"{voice}|{rate}|{pitch}|{text}".encode("utf-8")).hexdigest()
    cache_file = config.TTS_CACHE_DIR / f"{key}.mp3"
    if cache_file.exists():
        return cache_file.read_bytes()
    data = None
    for proxy in (config.EDGE_TTS_PROXY, None):
        try:
            buf = io.BytesIO()
            com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, proxy=proxy)
            import asyncio
            async def _run():
                async for chunk in com.stream():
                    if chunk["type"] == "audio":
                        buf.write(chunk["data"])
            asyncio.run(_run())
            if buf.getvalue():
                data = buf.getvalue()
                break
        except Exception as e:  # noqa: BLE001
            print("[tts] try fail:", str(e)[:100])
    if data:
        try:
            cache_file.write_bytes(data)
        except Exception:  # noqa: BLE001
            pass
    return data
