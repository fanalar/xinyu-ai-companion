// Pure turn detector, shared by the continuous microphone and deterministic tests.
export class VoiceActivity {
  constructor({ silenceMs = 1000, maxMs = 30000, onStart, onEnd } = {}) {
    Object.assign(this, { silenceMs, maxMs, onStart, onEnd })
    this.noise = 0.0001
    this.reset()
  }
  reset() {
    this.active = false
    this.candidate = 0
    this.started = 0
    this.lastVoice = 0
  }
  feed(rms, now, busy = false) {
    const threshold = Math.max(busy ? 0.0016 : 0.0008, this.noise * (busy ? 3.5 : 2.8))
    if (rms > threshold) {
      this.lastVoice = now
      if (!this.active) {
        if (!this.candidate) this.candidate = now
        if (now - this.candidate >= (busy ? 200 : 140)) {
          this.active = true
          this.started = this.candidate
          this.onStart?.()
        }
      }
    } else {
      if (!this.active) {
        this.candidate = 0
        if (!busy) this.noise = Math.min(0.015, this.noise * 0.98 + rms * 0.02)
      }
    }
    if (this.active && (now - this.lastVoice >= this.silenceMs || now - this.started >= this.maxMs)) {
      this.reset()
      this.onEnd?.()
    }
    return this.active
  }
}
