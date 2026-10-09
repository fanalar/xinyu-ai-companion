// 麦克风录音 & 语音识别
let mediaRecorder = null
let chunks = []
let stream = null

export async function startRec() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('当前环境不支持麦克风')
  }
  stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
    ? 'audio/webm;codecs=opus' : 'audio/webm'
  mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  chunks = []
  mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
  mediaRecorder.start()
}

export function stopRec() {
  return new Promise((resolve) => {
    if (!mediaRecorder) return resolve(null)
    const mr = mediaRecorder
    mr.onstop = () => {
      try { stream.getTracks().forEach((t) => t.stop()) } catch (e) { /* ignore */ }
      mediaRecorder = null
      resolve(new Blob(chunks, { type: 'audio/webm' }))
    }
    try { mr.stop() } catch (e) { resolve(null) }
  })
}

/** 免提录音：自动检测静音结束
 *  说话后停顿 silenceMs → 结束；一直没人说话 noSpeechMs → 结束；最长 maxMs
 *  返回 { blob, hadSpeech }
 */
export function recordUntilSilence(opts = {}) {
  const { silenceMs = 1400, minMs = 700, maxMs = 15000, noSpeechMs = 6000, threshold = 0.02 } = opts
  return new Promise((resolve, reject) => {
    ;(async () => {
      let localStream
      let ctx
      let mr
      const parts = []
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mime = (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
          ? 'audio/webm;codecs=opus' : 'audio/webm'
        mr = new MediaRecorder(localStream, mime ? { mimeType: mime } : undefined)
        mr.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data) }
      } catch (e) {
        reject(e)
        return
      }
      const cleanup = () => {
        try { localStream.getTracks().forEach((t) => t.stop()) } catch (e) { /* ignore */ }
        try { ctx && ctx.close() } catch (e) { /* ignore */ }
      }
      let speech = false
      let silStart = 0
      const t0 = performance.now()
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        try { mr.stop() } catch (e) { /* ignore */ }
      }
      mr.onstop = () => {
        cleanup()
        resolve({ blob: new Blob(parts, { type: 'audio/webm' }), hadSpeech: speech })
      }
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)()
        const src = ctx.createMediaStreamSource(localStream)
        const an = ctx.createAnalyser()
        an.fftSize = 512
        const data = new Uint8Array(an.fftSize)
        src.connect(an)
        mr.start()
        const tick = () => {
          if (finished || mr.state === 'inactive') return
          an.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v }
          const rms = Math.sqrt(sum / data.length)
          const now = performance.now()
          const elapsed = now - t0
          if (rms > threshold) {
            speech = true
            silStart = 0
          } else if (speech) {
            if (!silStart) silStart = now
            else if (now - silStart > silenceMs && elapsed > minMs) { finish(); return }
          }
          if (elapsed > maxMs) { finish(); return }
          if (!speech && elapsed > noSpeechMs) { finish(); return }
          requestAnimationFrame(tick)
        }
        tick()
      } catch (e) {
        cleanup()
        reject(e)
      }
    })()
  })
}

export async function transcribe(blob, signal) {
  if (!blob || !blob.size) throw new Error('没有录到声音')
  const fd = new FormData()
  fd.append('file', blob, blob.type === 'audio/wav' ? 'voice.wav' : 'voice.webm')
  const r = await fetch('/api/stt', { method: 'POST', body: fd, signal })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || ('识别失败 HTTP ' + r.status))
  return d.text || ''
}
