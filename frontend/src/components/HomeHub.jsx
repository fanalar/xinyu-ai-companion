import React, { useState } from 'react'
import { CHARACTERS, charFile } from '../lib/characters.js'
import Icon from './Icon.jsx'
export default function HomeHub({ profiles = [], companion, onSelect, onSwitchProfile, activeProfile, onGoCompanion, onGoPet }) {
  const [filter, setFilter] = useState('all')
  const hour = new Date().getHours()
  const greeting = hour < 11 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  return <div className="hub-page discovery-page">
    <header className="page-heading"><div className="eyebrow">A PLACE TO BELONG</div><h1>{greeting}，欢迎回到心屿</h1><p>找一个懂你的人，把日常说成故事。</p></header>
    <button className="featured-companion" onClick={onGoCompanion}>
      <div className="featured-copy"><span className="eyebrow">继续我们的故事</span><h2>{companion.name}，在等你</h2><p>不必想好开场白。<br />直接开口，我就在这里。</p><span className="featured-cta">进入陪伴 <Icon name="arrow" size={18} /></span></div><img src={charFile(companion.char)} alt={companion.name} />
    </button>
    {profiles.length > 1 && <section className="saved-companions"><h2>熟悉的伙伴</h2><div>{profiles.map(p => <button key={p.id} className={p.id === activeProfile ? 'selected' : ''} onClick={() => onSwitchProfile(p.id)}><img src={charFile(p.char)} alt=""/><span><b>{p.name}</b><small>{p.id === activeProfile ? '当前陪伴' : '继续聊天'}</small></span></button>)}</div></section>}
    <div className="section-heading"><div><h2>选择你的陪伴</h2><p>每位伙伴都有独立的聊天与记忆，切换后随时续聊</p></div><div className="filter-chips">{[['all','全部'],['f','她'],['m','他']].map(([id,label]) => <button key={id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div></div>
    <div className="discovery-grid">{CHARACTERS.filter(c => filter === 'all' || c.gender === filter).map(c => <button key={c.id} className={'character-card' + (companion.char === c.id ? ' selected' : '')} onClick={() => companion.char === c.id ? onGoCompanion() : onSelect(c.id)}>
      <div className="character-image"><img src={charFile(c.id)} alt={c.name} /><span>{companion.char === c.id ? '当前陪伴' : profiles.some(p => p.char === c.id) ? '继续聊天' : '初次认识'}</span></div><div className="character-copy"><h3>{c.name}<small>{c.title}</small></h3><p>{c.personality.split('，').slice(1,3).join(' · ')}</p></div>
    </button>)}</div>
    <button className="pet-entry" onClick={onGoPet}><img src="/pets/bunny.svg" alt="云仔" /><div><span className="eyebrow">LITTLE JOYS</span><h3>云仔的小窝</h3><p>一起摸摸头，收集生活里的小快乐</p></div><Icon name="arrow" /></button>
  </div>
}
