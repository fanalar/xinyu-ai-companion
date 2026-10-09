import React, { useEffect, useRef, useState } from 'react'
import { charFile } from '../lib/characters.js'
import Icon from './Icon.jsx'
import './stage.css'

// 各角色嘴部中心位置（占立绘高度比例，已视觉校准）
const MOUTH_Y = { f1: 0.48, f2: 0.36, f3: 0.34, m1: 0.26, m2: 0.31, m3: 0.28 }

// 数字人视频（有视频的角色自动启用视频舞台）
const CHAR_VIDEOS = {} // Bring your own licensed video assets.

export default function Stage2D({ companion, affection, level, talk, hfOn, hfState, onToggleHf, onOpenSettings, onOpenDressup, onVoiceText, onOpenTextChat, charId, micLevel = 0, err, onRetry, onInterrupt, modelReady, version, onOpenConnection, children }) {
  const canvasRef = useRef(null)
  const swayRef = useRef(null)
  const [imgErr, setImgErr] = useState(false)
  const [immersive, setImmersive] = useState(false)
  const cid = charId || companion.char || 'f3'
  const customAvatar = companion.avatar ? `/api/avatar/current?t=${encodeURIComponent(companion.avatar)}` : null
  const vids = customAvatar ? null : (CHAR_VIDEOS[cid] || null)
  const vidIdleRef = useRef(null)
  const vidTalkRef = useRef(null)
  const vidBoxRef = useRef(null)
  const wrapRef = useRef(null)

  // 视频模式：待机循环 + 说话自动切换 + 尺寸自适应
  useEffect(() => {
    if (!vids) return undefined
    const vi = vidIdleRef.current, vt = vidTalkRef.current, box = vidBoxRef.current, wrap = wrapRef.current
    if (!vi || !vt || !box || !wrap) return undefined
    const fitV = () => {
      const r = wrap.getBoundingClientRect()
      box.style.width = r.width + 'px'
      box.style.height = r.height + 'px'
    }
    vi.addEventListener('loadedmetadata', fitV)
    window.addEventListener('resize', fitV)
    const t = setTimeout(fitV, 60)

    // 播放解锁：Chromium 自动播放策略 + 首帧就绪后重试
    const kick = () => {
      if (!vi.muted) vi.muted = true
      if (!vt.muted) vt.muted = true
      if (vi.paused) vi.play().catch(() => {})
    }
    vi.addEventListener('loadeddata', kick)
    vi.addEventListener('canplay', kick)
    window.addEventListener('pointerdown', kick)
    window.addEventListener('keydown', kick)
    const t2 = setTimeout(kick, 400)
    kick()

    let raf = 0
    let fc = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const on = !!window.__xinyuSpeaking
      if (on && !vt.classList.contains('on')) { vt.play().catch(() => {}); vt.classList.add('on') }
      else if (!on && vt.classList.contains('on')) { vt.classList.remove('on'); if (vi.paused) vi.play().catch(() => {}) }
      // 看门狗：待机视频被意外暂停时自动恢复
      if ((++fc % 120) === 0 && vi.paused) vi.play().catch(() => {})
    }
    loop()
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
      cancelAnimationFrame(raf)
      vi.removeEventListener('loadedmetadata', fitV)
      vi.removeEventListener('loadeddata', kick)
      vi.removeEventListener('canplay', kick)
      window.removeEventListener('resize', fitV)
      window.removeEventListener('pointerdown', kick)
      window.removeEventListener('keydown', kick)
    }
  }, [vids, cid])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || CHAR_VIDEOS[cid] || customAvatar) return
    const ctx = canvas.getContext('2d')
    let raf = 0
    let disposed = false
    let ready = false
    let W = 0
    let H = 0
    let mouthY = 0
    let vS = 0
    let lastV = -1
    const img = new Image()

    const draw = (v) => {
      if (!ready) return
      ctx.clearRect(0, 0, W, H)
      if (v <= 0.02) {
        ctx.drawImage(img, 0, 0)
        return
      }
      const dy = v * H * 0.012
      const lipH = Math.max(7, Math.round(H * 0.011))
      const y0 = Math.max(1, mouthY - Math.round(lipH / 2))
      ctx.drawImage(img, 0, 0, W, y0, 0, 0, W, y0)
      ctx.drawImage(img, 0, y0, W, lipH, 0, y0, W, lipH + dy)
      ctx.drawImage(img, 0, y0 + lipH, W, H - y0 - lipH, 0, y0 + lipH + dy, W, H - y0 - lipH)
    }

    img.onload = () => {
      if (disposed) return
      W = img.naturalWidth
      H = img.naturalHeight
      mouthY = Math.round(H * (MOUTH_Y[cid] || 0.23))
      canvas.width = W
      canvas.height = H
      ready = true
      draw(0)
    }
    img.onerror = () => setImgErr(true)
    img.src = charFile(cid)

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const lvl = (window.__xinyuLip && window.__xinyuLip.level) || 0
      vS += (lvl - vS) * (lvl > vS ? 0.3 : 0.1)
      if (ready && Math.abs(vS - lastV) > 0.006) {
        draw(vS)
        lastV = vS
      }
      const el = swayRef.current
      if (el) el.style.transform = 'none'
    }
    tick()
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
    }
  }, [cid, customAvatar])

  const statuses = {
    connecting: ['正在连接麦克风', '马上就能开口聊天'],
    listening: ['我在听，你说吧', '说完稍停一下，我就会回应'],
    hearing: ['嗯，我在认真听', '不用按按钮，继续说就好'],
    transcribing: ['正在听懂你的话', '你也可以继续说，补充或换个话题'],
    thinking: ['让我想一想', '想补充什么？随时开口就好'],
    preparing: ['正在准备语音', '回复也会同步出现在字幕里'],
    speaking: [companion.name + '正在说话', '外放时点停止插话；耳机模式可直接开口'],
    idle: ['安静陪着你', '麦克风已暂停，点一下即可继续'],
    error: ['麦克风暂时不可用', '查看下方提示后重新连接'],
  }
  const status = statuses[hfState] || statuses.idle
  const busy = ['speaking', 'thinking', 'preparing', 'transcribing'].includes(hfState)
  return <div className={"stage stage2d companion-scene"+(immersive?" is-immersive":"")}>
    <header className="scene-heading"><div><div className="eyebrow">心屿 · 个人内测 {version}</div><h1>给日常，留一点温柔</h1></div><button className="scene-view-toggle" aria-label="切换沉浸陪伴" aria-pressed={immersive} onClick={()=>setImmersive(v=>!v)}>{immersive?"完整对话":"沉浸陪伴"}</button><button className="icon-btn" aria-label="设置" title="设置" onClick={onOpenSettings}><Icon name="settings" /></button></header>
    <section className="portrait-panel">
      <div className="portrait-backdrop" aria-hidden="true" style={{backgroundImage:`url("${customAvatar || charFile(cid)}")`}} />
      <div className="portrait-wrap" ref={wrapRef}>
        {customAvatar ? <img className="custom-portrait" src={customAvatar} alt={companion.name + '的专属形象'} /> : vids ? <div className="portrait-breathe"><div className="portrait-sway"><div className="vidbox" ref={vidBoxRef}>
          <video ref={vidIdleRef} src={vids.idle} poster={charFile(cid)} muted loop playsInline autoPlay />
          <video ref={vidTalkRef} src={vids.talk} poster={charFile(cid)} muted loop playsInline className="talk" />
        </div></div></div> : imgErr ? <div className="stage-status">形象加载失败</div> : <div className="portrait-breathe"><div className="portrait-sway" ref={swayRef}><canvas ref={canvasRef} className="portrait-canvas" /></div></div>}
      </div>
      <div className="portrait-shade" />
      <div className="portrait-label"><span className="scene-pill"><i /> 在你身边</span><h2>{companion.name}</h2><p>{companion.personality?.split('，')[0] || '温柔陪伴'} · {level}</p></div>
      <button className="portrait-dress" onClick={onOpenDressup}><Icon name="dress" size={17} /> 装扮</button>
    </section>
    {React.isValidElement(children) ? React.cloneElement(children, { immersive, onFullConversation: () => setImmersive(false) }) : children}
  </div>
}
