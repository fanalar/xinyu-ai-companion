import { VoiceActivity } from './voiceActivity.js'
import { playbackGate } from './playbackGate.js'

export function pcmToWav(chunks, sampleRate) {
  const length = chunks.reduce((n, c) => n + c.length, 0)
  const buffer = new ArrayBuffer(44 + length * 2)
  const v = new DataView(buffer)
  const str = (at, s) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + length * 2, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, length * 2, true)
  let p = 44
  for (const c of chunks) for (const x of c) {
    v.setInt16(p, Math.max(-1, Math.min(1, x)) * (x < 0 ? 32768 : 32767), true); p += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

// One microphone stream; speaker playback is deliberately excluded from capture.
export class ContinuousMic {
  constructor(callbacks) { this.callbacks = callbacks; this.stopped = false }
  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1,
    } })
    if (this.stopped) { stream.getTracks().forEach(t => t.stop()); return }
    this.stream = stream
    try {
      this.ctx = new AudioContext({ latencyHint: 'interactive' })
      await this.ctx.resume()
      if (this.stopped) return
      this.src = this.ctx.createMediaStreamSource(stream)
      // Audio callbacks remain active when the desktop window loses focus.
      this.node = this.ctx.createScriptProcessor(2048, 1, 1)
      this.sink = this.ctx.createGain(); this.sink.gain.value = 0
      this.src.connect(this.node); this.node.connect(this.sink); this.sink.connect(this.ctx.destination)
      this.ring = []; this.parts = []
      this.revision = playbackGate.revision
      const preRoll = Math.ceil(this.ctx.sampleRate * 1.2 / 2048)
      const detectionWindow = Math.ceil(this.ctx.sampleRate * 0.48 / 2048)
      this.detection = []; this.lastCheck = 0; this.vadPending = false
      this.vad = new VoiceActivity({
        silenceMs: this.callbacks.silenceMs,
        onStart: () => { this.parts = this.ring.slice(); this.callbacks.onSpeechStart?.() },
        onEnd: () => {
          const blob = pcmToWav(this.parts, this.ctx.sampleRate)
          this.parts = []; this.ring = []
          this.callbacks.onUtterance?.(blob)
        },
      })
      stream.getAudioTracks()[0].onended = () => { if (!this.stopped) this.callbacks.onError?.(new Error('麦克风已断开，请重新连接后重试')) }
      this.node.onaudioprocess = e => {
        if (this.stopped) return
        if (this.revision !== playbackGate.revision) {
          this.revision = playbackGate.revision
          if (!this.callbacks.headphones?.()) { this.vad.reset(); this.parts = []; this.ring = []; this.detection = [] }
        }
        if (playbackGate.protected(performance.now(), this.callbacks.headphones?.())) {
          this.vad.reset(); this.parts = []; this.ring = []; this.detection = []
          this.callbacks.onLevel?.(0)
          return
        }
        const frame = new Float32Array(e.inputBuffer.getChannelData(0))
        const rms = Math.sqrt(frame.reduce((n, x) => n + x * x, 0) / frame.length)
        // Include the final silent frame before onEnd packages the turn.
        if (this.vad.active) this.parts.push(frame)
        else { this.ring.push(frame); if (this.ring.length > preRoll) this.ring.shift() }
        this.detection.push(frame)
        if (this.detection.length > detectionWindow) this.detection.shift()
        const now = performance.now()
        // Backend neural VAD sees raw windows locally. Weak speech and non-speech
        // noise must not be distinguished solely by an absolute loudness cutoff.
        if (!this.vadPending && this.detection.length === detectionWindow && now-this.lastCheck >= 160) {
          this.vadPending = true; this.lastCheck = now
          const revision = playbackGate.revision
          const controller = new AbortController(); this.vadController = controller
          const form = new FormData(); form.append('file', pcmToWav(this.detection, this.ctx.sampleRate), 'window.wav')
          fetch('/api/vad', {method:'POST',body:form,signal:controller.signal}).then(async response => {
            if (!response.ok) throw new Error('本地语音检测暂时不可用，请重试麦克风')
            const result = await response.json()
            if (this.stopped || playbackGate.protected() && !this.callbacks.headphones?.()) return
            if (revision !== playbackGate.revision && !this.callbacks.headphones?.()) return
            this.vad.feed(result.speech ? 0.1 : 0, performance.now(), this.callbacks.isBusy?.())
          }).catch(e => { if (!this.stopped && e.name !== 'AbortError') this.callbacks.onError?.(e) }).finally(() => {
            if (this.vadController === controller) this.vadController = null
            this.vadPending = false
          })
        }
        this.callbacks.onLevel?.(Math.min(1, rms * 7))
      }
    } catch (e) { this.stop(); throw e }
  }
  stop() {
    this.stopped = true
    this.vadController?.abort()
    if (this.node) this.node.onaudioprocess = null
    for (const n of [this.src, this.node, this.sink]) { try { n?.disconnect() } catch {} }
    this.stream?.getTracks().forEach(t => t.stop())
    this.ctx?.close().catch(() => {})
    this.ring = []; this.parts = []
  }
}
