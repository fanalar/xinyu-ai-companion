// Protect the complete reply, including synthesis gaps and the acoustic tail.
// Browser echoCancellation alone cannot prove that loudspeaker echo is removed.
export class PlaybackGate {
  constructor() { this.active = false; this.tailUntil = 0; this.revision = 0; this.played = false }
  begin() { this.active = true; this.played = false; this.revision++ }
  playing() { this.played = true }
  end(now = performance.now()) {
    if (!this.active) return
    if (this.active && this.played) this.tailUntil = Math.max(this.tailUntil, now + 1200)
    this.active = false; this.played = false; this.revision++
  }
  protected(now = performance.now(), headphones = false) { return !headphones && (this.active || now < this.tailUntil) }
}
export const playbackGate = new PlaybackGate()
