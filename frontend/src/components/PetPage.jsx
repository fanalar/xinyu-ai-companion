import React, { useEffect, useRef, useState } from 'react'
import { speak, stopSpeaking } from '../api.js'

const LINES = {
  touch: ['嘿嘿，好舒服～', '再摸摸嘛～', '你回来啦，想你！', '摸摸头，开心指数+1！'],
  feed: ['胡萝卜最好吃啦！', '呜哇，谢谢投喂～', '吃饱饱，能量满满！', '吧唧吧唧～还要！'],
  play: ['陪我玩球球！', '转圈圈～转圈圈～', '耶！接住啦！', '再来一次好不好！'],
}

export default function PetPage() {
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('xinyu_pet_energy') || 62))
  const [line, setLine] = useState('你好呀，我是云仔，今天也想和你玩～')
  const [hearts, setHearts] = useState([])
  const [talking, setTalking] = useState(false)
  const speakLock = useRef(false)
  const alive = useRef(true)
  const timers = useRef([])
  useEffect(() => { alive.current = true; return () => { alive.current = false; timers.current.forEach(clearTimeout); stopSpeaking() } }, [])

  const interact = async (kind) => {
    const pool = LINES[kind] || LINES.touch
    const text = pool[Math.floor(Math.random() * pool.length)]
    setLine(text)
    const add = kind === 'feed' ? 5 : kind === 'play' ? 4 : 3
    setEnergy((e) => {
      const nv = Math.min(100, e + add)
      localStorage.setItem('xinyu_pet_energy', String(nv))
      return nv
    })
    const id = Date.now()
    setHearts((h) => [...h, { id }])
    timers.current.push(setTimeout(() => { if (alive.current) setHearts((h) => h.filter((x) => x.id !== id)) }, 1400))
    if (!speakLock.current) {
      speakLock.current = true
      setTalking(true)
      try { await speak(text, { voice: 'zh-CN-XiaoyiNeural', pitch: '+40Hz', rate: '+5%' }) } catch (e) { /* ignore */ }
      if (alive.current) setTalking(false)
      speakLock.current = false
    }
  }

  const lv = Math.min(10, 1 + Math.floor(energy / 11))

  return (
    <div className="pet-page">
      <div className="pet-head">
        <div className="eyebrow">SMALL THINGS, SOFT DAYS</div>
        <div className="pet-title">云仔的小窝</div>
        <div className="pet-sub">给生活留一点软乎乎的时间。</div>
      </div>

      <div className="pet-stage">
        <div className="pet-lv">
          <div className="pet-lv-badge">⭐</div>
          <div>
            <div className="pet-lv-name">Lv.{lv} · 温柔伙伴</div>
            <div className="pet-energy"><div className="pet-energy-fill" style={{ width: energy + '%' }} /></div>
            <div className="pet-energy-txt">爱心能量 {energy}%</div>
          </div>
        </div>
        <div className={'pet-img-wrap' + (talking ? ' talking' : '')}>
          <img className="pet-img" src="/pets/bunny.svg" alt="" />
          {hearts.map((h) => <span key={h.id} className="pet-heart">💗</span>)}
        </div>
        <div className="pet-bubble">{line}</div>
      </div>

      <div className="pet-actions">
        <button className="pet-btn" onClick={() => interact('touch')}><span className="pb-ic">🤗</span>摸摸头</button>
        <button className="pet-btn" onClick={() => interact('feed')}><span className="pb-ic">🥕</span>喂食</button>
        <button className="pet-btn" onClick={() => interact('play')}><span className="pb-ic">🎾</span>玩耍</button>
      </div>

      <div className="pet-foot">摸摸头 +3 · 喂食 +5 · 玩耍 +4<br/>你的爱心能量会保存在这台电脑。</div>
    </div>
  )
}
