import React, { useEffect, useState } from 'react'
import { api, speak, stopSpeaking } from '../api.js'
import Icon from './Icon.jsx'
import Diagnostics from './Diagnostics.jsx'
import ReachSettings from './ReachSettings.jsx'

export default function SettingsModal({ open, initialTab = 'persona', onClose, boot, companion, onRefresh, affection, silenceMs, onChangePause, headphones, onChangeHeadphones }) {
  const [tab, setTab] = useState('persona')
  const [memories, setMemories] = useState([])
  const [newMemory, setNewMemory] = useState('')
  const [draft, setDraft] = useState({})
  const [connection, setConnection] = useState({})
  const [testResult, setTestResult] = useState(null)
  const [key, setKey] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) {
      setTab(initialTab)
      setDraft({ ...companion }); setMsg(''); setKey(''); setTestResult(null)
      api.memories().then(r => setMemories(r.memories || [])).catch(() => setMsg('记忆暂时未能读取'))
      api.connection().then(setConnection).catch(() => setMsg('连接设置暂时未能读取'))
    }
    return () => stopSpeaking()
  }, [open, initialTab])
  if (!open) return null
  const task = async action => { setBusy(true); setMsg(''); try { await action() } catch (e) { setMsg(e.message) } finally { setBusy(false) } }
  const field = (name, value) => setDraft(d => ({ ...d, [name]: value }))
  const labels = [['persona','个性与声音'],['mem','专属记忆'],['voice','语音体验'],['connect','连接'],['reach','联网资讯'],['check','内测检查'],['about','关于']]
  return <div className="modal-mask" onClick={e => e.target === e.currentTarget && onClose()}><div className="modal settings-panel" role="dialog" aria-modal="true" aria-label="陪伴设置">
    <div className="modal-head"><div><div className="eyebrow">MAKE IT YOURS</div><span>我们的相处方式</span></div><button className="icon-btn" aria-label="关闭设置" onClick={onClose}><Icon name="close" /></button></div>
    <div className="settings-tabs">{labels.map(([id,label]) => <button key={id} onClick={() => { setTab(id); setMsg('') }} className={tab === id ? 'on' : ''}>{label}</button>)}</div>
    <div className="modal-body">
      {tab === 'persona' && <div className="settings-form"><p className="form-note">不只是一个名字。让 TA 的语气、性格和声音，都更贴近你。</p><div className="form-grid"><label>TA 的名字<input value={draft.name || ''} maxLength={30} onChange={e => field('name', e.target.value)} /></label><label>TA 怎么称呼你<input value={draft.petname || ''} maxLength={30} placeholder="亲爱的" onChange={e => field('petname', e.target.value)} /></label></div><label>你们的关系<select value={draft.relationship || '恋人'} onChange={e => field('relationship', e.target.value)}>{['恋人','知己','朋友','生活搭子'].map(x => <option key={x}>{x}</option>)}</select></label><label>性格与背景<textarea rows={4} value={draft.personality || ''} maxLength={1200} onChange={e => field('personality', e.target.value)} placeholder="例如：温柔但有自己的主见，喜欢音乐；我疲惫时，先听我说，再给建议。" /></label><label>声音<select value={draft.voice || 'zh-CN-XiaoxiaoNeural'} onChange={e => field('voice', e.target.value)}>{(boot.voices || []).map(v => <option key={v.id || v.voice} value={v.id || v.voice}>{v.label || v.name}</option>)}</select></label><label>语速<select value={draft.rate || '+0%'} onChange={e => field('rate', e.target.value)}><option value="-15%">慢一点</option><option value="+0%">自然</option><option value="+15%">快一点</option></select></label><div className="form-actions"><button className="btn ghost" disabled={busy} onClick={() => task(async () => { if (!await speak('我在呢，今天也想听你说说话。', { voice: draft.voice, rate: draft.rate })) throw new Error('试听未能播放，请检查网络') })}><Icon name="sound" size={16} /> 试听声音</button><button className="btn" disabled={busy || !draft.name?.trim()} onClick={() => task(async () => { await api.saveCompanion(draft); await onRefresh(); setMsg('相处方式已保存') })}>保存设置</button></div></div>}
      {tab === 'mem' && <><div className="section-heading"><div><h3>值得被记住的事</h3><p>对话会定期整理记忆，你也可以亲自补充。</p></div><span>{memories.length} 条</span></div><label className="settings-form">添加专属记忆<textarea rows={2} value={newMemory} onChange={e => setNewMemory(e.target.value)} maxLength={500} placeholder="例如：我喜欢雨天和热咖啡；下周五是我的生日。" /></label><button className="btn" disabled={busy || !newMemory.trim()} onClick={() => task(async () => { const r = await api.addMemory(newMemory); setMemories(r.memories); setNewMemory(''); await onRefresh(); setMsg('这件事已记下') })}>记住这件事</button><div className="memory-cards">{memories.length ? memories.map(m => <article key={m.id}><Icon name="memory" size={17} /><p>{m.content}</p><button aria-label="删除这条记忆" disabled={busy} onClick={() => { if (confirm('让 TA 忘记这条记忆？')) task(async () => { const r = await api.deleteMemory(m.id); setMemories(r.memories); await onRefresh() }) }}><Icon name="close" size={16} /></button></article>) : <div className="empty-memory">还没有记忆。先告诉 TA 一件关于你的事吧。</div>}</div></>}
      {tab === 'voice' && <div className="settings-form"><h3>像通话一样，轻松聊</h3><p className="form-note">进入陪伴页面就自动开启麦克风。离开陪伴页或打开设置时暂停采集，返回后继续。文字输入就在陪伴页，语音与文字可以交替进行。</p><label>声音输出方式<select aria-label="声音输出方式" value={headphones ? "headphones" : "speaker"} onChange={e => onChangeHeadphones(e.target.value === "headphones")}><option value="speaker">电脑外放 · 防回声</option><option value="headphones">我已戴耳机 · 可直接插话</option></select></label><p className="form-note">仅在戴耳机、扬声器不发声时开启直接插话。重启应用或音频设备变化后会恢复外放保护。</p><label>说完后等多久再回应<select value={silenceMs} onChange={e => onChangePause(e.target.value)}><option value="700">敏捷 · 0.7 秒</option><option value="1000">自然 · 1 秒</option><option value="1600">慢慢说 · 1.6 秒</option></select></label><div className="feature-note"><Icon name="mic"/><div><b>连续对话与插话</b><p>你说完后自动发送，回复播完自动继续听。思考时可直接补充；外放播报时点停止按钮插话。</p></div></div><div className="feature-note"><Icon name="sound"/><div><b>外放防回声</b><p>整段播报和尾音不会进入识别，避免 TA 被自己的声音打断。浏览器回声消除同时开启。</p></div></div><div className="feature-note"><Icon name="memory"/><div><b>语音与文字共享上下文</b><p>录音在本地识别；聊天内容会发送到你配置的模型服务。语音朗读使用在线语音服务。</p></div></div></div>}
      {tab === 'connect' && <div className="settings-form"><div className="connection-status">{testResult?.ok ? '模型已连通' : connection.configured ? '已保存模型密钥' : '请配置对话模型'}<small>已保存不代表服务已连通</small></div><label>服务地址<input value={connection.base_url || ''} onChange={e => setConnection(c => ({ ...c, base_url: e.target.value }))} placeholder="https://api.deepseek.com/v1" /></label><label>模型名称<input value={connection.model || ''} onChange={e => setConnection(c => ({ ...c, model: e.target.value }))} placeholder="deepseek-chat" /></label><label>API 密钥<input type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} placeholder={connection.configured ? '留空保留已有密钥' : '在此填写你的 API 密钥'} /></label><p className="form-note">密钥使用 Windows 加密保存在本机，不显示、不随安装包分发。保存后可返回陪伴页测试对话。</p><button className="btn" disabled={busy} onClick={() => task(async () => { setConnection(await api.saveConnection({ ...connection, key })); setKey(''); setTestResult(null); await onRefresh(); setMsg('连接设置已保存，请点击测试连接') })}>保存连接</button><button className="btn ghost" disabled={busy || !!key} onClick={() => task(async () => { const r = await api.testConnection(); setTestResult(r); setMsg(r.message + (r.ok ? `（${r.latency_ms} 毫秒）` : '')) })}>测试连接</button><p className="form-note">测试会使用已保存的设置发送一句简短请求，可能产生少量模型用量。修改设置后请先保存。</p></div>}
      {tab === 'reach' && <ReachSettings />}{tab === 'check' && <Diagnostics />}
      {tab === 'about' && <><div className="about-brand">♡<h2>心屿</h2><p>在这里，靠近一点。</p><small>桌面版 {boot.version}</small></div><div className="feature-note"><Icon name="heart"/><div><b>好感度 {affection}</b><p>关系在每次交流里，慢慢变得熟悉。</p></div></div><p className="form-note">TA 是虚拟陪伴角色。聊天记录和记忆保存在这台电脑；连接模型与语音服务需要网络。</p><div className="data-actions"><button className="btn ghost" disabled={busy} onClick={() => { if (confirm('清空聊天记录？记忆、角色与好感度保留。')) task(async () => { await api.reset('messages'); await onRefresh(); setMsg('聊天记录已清空，记忆保留') }) }}>清空聊天记录</button><button className="btn ghost danger-link" disabled={busy} onClick={() => { if (confirm('重新定制将删除当前角色的聊天和记忆，其他伙伴会保留。确定继续？')) task(async () => { await api.reset('all'); await onRefresh() }) }}>重新定制</button></div></>}
      {msg && <div className={"settings-message" + (testResult && !testResult.ok ? " failure" : "")} role="status">{msg}</div>}
    </div>
  </div></div>
}

