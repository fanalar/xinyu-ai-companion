import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'
export default function MinePage({companion,affection,level,messageCount=0,memoryCount=0,onOpenDressup,onOpenSettings,onOpenMemory,version}) {
 const [plan,setPlan]=useState(null),[notice,setNotice]=useState('')
 useEffect(()=>{api.entitlements().then(setPlan).catch(()=>setNotice('内测权益暂时未能读取'))},[])
 return <div className="mine-page content-page"><header className="page-heading"><div className="eyebrow">我们的故事</div><h1>把熟悉，留在日常里</h1><p>照顾好自己的节奏。想聊的时候，心屿就在这里。</p></header><section className="relationship-card"><Avatar comp={companion} size={76}/><div><h2>{companion.name}</h2><p>{companion.relationship||'知己'} · 称呼你「{companion.petname||'你'}」</p><span>{level}</span></div><button className="btn ghost" onClick={()=>onOpenSettings('persona')}>调整相处方式</button></section>
 <div className="relationship-stats"><div><b>{messageCount}</b><span>聊天消息</span></div><div><b>{memoryCount}</b><span>专属记忆</span></div><div><b>{affection}</b><span>互动积分</span></div></div><p className="stats-note">互动积分是本机的聊天进度记录，不代表真实情感，也不影响功能使用。</p>
 <section className="beta-membership"><div><span className="beta-badge">PERSONAL BETA</span><h2>{plan?.label||'个人内测'}</h2><p>连续语音、独立角色、记忆管理和记录导出，当前均可体验。</p><small>暂不收款 · 无自动续费 · 模型服务按你自己的连接计费</small></div><Icon name="heart" size={42}/></section>
 <div className="account-grid">{[{ic:'memory',title:'记忆与约定',desc:'查看、补充和修正重要信息',action:onOpenMemory},{ic:'dress',title:'形象与装扮',desc:'让 TA 保留你喜欢的样子',action:onOpenDressup},{ic:'settings',title:'连接与内测检查',desc:'检查麦克风、识别、模型和声音',action:()=>onOpenSettings('check')},{ic:'copy',title:'导出陪伴记录',desc:'保存当前伙伴的聊天和记忆',action:()=>api.exportData().then(()=>setNotice('导出已开始，请选择保存位置')).catch(e=>setNotice(e.message))}].map(item=><button className="account-action" key={item.title} onClick={item.action}><Icon name={item.ic} size={23}/><div><b>{item.title}</b><p>{item.desc}</p></div><span>→</span></button>)}</div>
 {notice&&<div className="inline-notice" role="status">{notice}</div>}<div className="mine-foot">心屿 {version} · 个人内测版<br/>记录保存在本机。聊天发送到已配置的模型服务，朗读使用在线语音服务。<button className="text-button" onClick={()=>onOpenSettings('about')}>版本与数据管理</button></div></div>
}