import React from 'react'
import Icon from './Icon.jsx'

const TABS = [
  { id: 'companion', ic: 'heart', label: '陪伴' },
  { id: 'home', ic: 'home', label: '遇见' },
  { id: 'memory', ic: 'memory', label: '记忆' },
  { id: 'pet', ic: 'pet', label: '小窝' },
  { id: 'mine', ic: 'user', label: '我们' },
]

export default function TabBar({ view, onChange, version }) {
  return (
    <div className="tabbar">
      <div className="nav-brand"><span>♡</span><b>心屿</b><small>在这里，靠近一点</small></div>
      {TABS.map((t) => (
        <button key={t.id} className={'tb-item' + (view === t.id ? ' on' : '')}
                aria-label={t.label} aria-current={view === t.id ? 'page' : undefined} onClick={() => onChange && onChange(t.id)}>
          <span className="tb-ic"><Icon name={t.ic} /></span>
          {t.label}
        </button>
      ))}
      <div className="nav-foot">个人内测 · 无收费<small>心屿 {version}</small></div>
    </div>
  )
}
