// 后端 API 客户端
const BASE = ''
import { playbackGate } from './lib/playbackGate.js'

async function jpost(path, body, signal) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    signal,
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.detail || ('HTTP ' + r.status))
  return d
}

export const api = {
  state: () => fetch(BASE + '/api/state', { cache: 'no-store' }).then((r) => r.json()),
  saveCompanion: (c) => jpost('/api/companion', c),
  chat: (text, opts = {}) => jpost('/api/chat', { text, client_id: opts.clientId, voice: opts.voice, profile_id: opts.profileId }, opts.signal),
  createProfile: data => jpost('/api/profiles', data),
  switchProfile: id => jpost('/api/profiles/' + id + '/activate', {}),
  editMemory: (id, content) => jpost('/api/memories/' + id, { content }),
  diagnostics: () => fetch('/api/diagnostics').then(r => { if (!r.ok) throw new Error('诊断未能读取'); return r.json() }),
  reachStatus: () => fetch('/api/reach').then(r => r.json()),
  reachSettings: values => jpost('/api/reach/settings', values),
  reachProbe: signal => jpost('/api/reach/probe', {}, signal),
  entitlements: () => fetch('/api/entitlements').then(r => r.json()),
  exportData: async () => { const r = await fetch('/api/export'); if (!r.ok) throw new Error('导出失败，请重试'); downloadJson(await r.json(), '心屿-陪伴记录.json') },
  cancel: (clientId) => jpost('/api/chat/cancel', { client_id: clientId }),
  connection: () => fetch('/api/connection').then(r => r.json()),
  saveConnection: (data) => jpost('/api/connection', data),
  testConnection: () => jpost('/api/connection/test', {}),
  reset: (mode) => jpost('/api/reset', { mode }),
  generateAvatar: (prompt) => jpost('/api/avatar/generate', { prompt }),
  memories: () => fetch(BASE + '/api/memories').then((r) => r.json()),
  addMemory: (content) => jpost('/api/memories', { content }),
  deleteMemory: (id) => fetch('/api/memories/' + id, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error('记忆删除失败'); return r.json() }),
}

export function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json;charset=utf-8'}))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 全局口型电平（Stage 读取它驱动嘴部表情）
if (!window.__xinyuLip) window.__xinyuLip = { level: 0 }

let _audioCtx = null
function _getCtx() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    return _audioCtx
  } catch (e) { return null }
}

let currentStop = null
let speechGeneration = 0
export function stopSpeaking() {
  speechGeneration++
  currentStop?.()
  playbackGate.end()
  window.__xinyuSpeaking = false
  window.__xinyuLip = { level: 0 }
}

async function speakChunk(text, opts, generation) {
  const body = { text }
  if (opts.voice) body.voice = opts.voice
  if (opts.rate) body.rate = opts.rate
  if (opts.pitch) body.pitch = opts.pitch
  const r = await fetch(BASE + '/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  })
  if (!r.ok) throw new Error('TTS ' + r.status)
  const blob = await r.blob()
  if (opts.signal?.aborted || generation !== speechGeneration) return false
  const url = URL.createObjectURL(blob)
  return new Promise((resolve) => {
    const a = new Audio(url)
    let raf = 0
    let src = null
    let done = false
    const finish = (ok) => {
      if (done) return
      done = true
      a.pause()
      a.removeAttribute('src'); a.load()
      opts.signal?.removeEventListener('abort', abort)
      if (currentStop === abort) currentStop = null
      cleanup(); resolve(ok)
    }
    const abort = () => finish(false)
    const cleanup = () => {
      URL.revokeObjectURL(url)
      if (raf) cancelAnimationFrame(raf)
      window.__xinyuLip = { level: 0 }
      window.__xinyuSpeaking = false
      try { if (src) src.disconnect() } catch (e) { /* ignore */ }
    }
    currentStop = abort
    opts.signal?.addEventListener('abort', abort, { once: true })
    if (opts.signal?.aborted || generation !== speechGeneration) { abort(); return }
    // 尝试接入 WebAudio 分析（驱动口型）；失败则普通播放
    const ctx = _getCtx()
    if (ctx) {
      try {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
        src = ctx.createMediaElementSource(a)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        const data = new Uint8Array(analyser.fftSize)
        src.connect(analyser)
        analyser.connect(ctx.destination)
        const loop = () => {
          raf = requestAnimationFrame(loop)
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v }
          const rms = Math.sqrt(sum / data.length)
          window.__xinyuLip = { level: Math.min(1, rms * 4.5) }
        }
        loop()
      } catch (e) {
        try { src && src.disconnect() } catch (e2) { /* ignore */ }
        src = null
      }
    }
    a.onended = () => finish(true)
    a.onerror = () => finish(false)
    a.play().then(() => {
      if (done) return
      window.__xinyuSpeaking = true
      playbackGate.playing()
      opts.onPlaying?.(text)
    }).catch(() => finish(false))
  })
}

// 头像 URL（带时间戳防缓存）
export const avatarUrl = (comp) =>
  comp && comp.avatar ? `/api/avatar/current?t=${comp.avatar}` : null

// Keep a single cancellation generation across the whole bulletin.
export async function speak(text, opts = {}) {
  stopSpeaking()
  const generation = speechGeneration
  const chunks = []
  for (const line of String(text).split(/\n+/).filter(s => s.trim())) {
    for (let i = 0; i < line.length; i += 240) chunks.push(line.slice(i, i + 240))
  }
  if (!chunks.length || opts.signal?.aborted) return false
  playbackGate.begin()
  try {
    for (const chunk of chunks) {
      if (opts.signal?.aborted || generation !== speechGeneration) return false
      if (!await speakChunk(chunk, opts, generation)) return false
    }
    return true
  } finally { if (generation === speechGeneration) playbackGate.end() }
}
