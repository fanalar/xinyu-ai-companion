import React from 'react'
import { avatarUrl } from '../api.js'
import { charFile } from '../lib/characters.js'

const GRADS = [
  'linear-gradient(135deg,#ff9a9e,#fecfef)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#ff758c,#ff7eb3)',
  'linear-gradient(135deg,#89f7fe,#66a6ff)',
  'linear-gradient(135deg,#f6d365,#fda085)',
  'linear-gradient(135deg,#84fab0,#8fd3f4)',
]

export default function Avatar({ comp, size = 44, style }) {
  const url = avatarUrl(comp)
  const s = { width: size, height: size, borderRadius: '50%', flex: '0 0 auto', ...style }
  if (url) {
    return <img className="avatar" src={url} style={s} alt="" />
  }
  // 无专属生成头像时：用角色立绘裁头部
  if (comp && comp.char) {
    return <img className="avatar" src={charFile(comp.char)} style={{ ...s, objectPosition: '50% 14%' }} alt="" />
  }
  const ch = comp?.name ? comp.name.slice(0, 1) : '💗'
  const g = comp ? GRADS[(comp.name || '').length % GRADS.length] : GRADS[2]
  return (
    <div className="avatar avatar-fallback" style={{ ...s, background: g, fontSize: size * 0.42 }}>
      {ch}
    </div>
  )
}
