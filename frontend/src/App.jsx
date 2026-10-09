import React, { useEffect, useRef, useState } from 'react'
import { api, speak, stopSpeaking } from './api.js'
import { transcribe } from './lib/recorder.js'
import { ContinuousMic } from './lib/continuousMic.js'
import { charById } from './lib/characters.js'
import Wizard from './components/Wizard.jsx'
import Chat from './components/Chat.jsx'
import Stage from './components/Stage.jsx'
import HomeHub from './components/HomeHub.jsx'
import TabBar from './components/TabBar.jsx'
import PetPage from './components/PetPage.jsx'
import MinePage from './components/MinePage.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import DressupPanel from './components/DressupPanel.jsx'
import MemoryPage from './components/MemoryPage.jsx'
import { UI_VERSION } from './lib/build.js'
import { isOnlineQuery } from './lib/online.js'

export default function App() {
  const [boot, setBoot] = useState(null)
  const [companion, setCompanion] = useState(null)
  const [affection, setAffection] = useState(10)
  const [level, setLevel] = useState('初识')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [talk, setTalk] = useState(null)
  const [speechCaption, setSpeechCaption] = useState('')
  const [err, setErr] = useState('')
  const [view, setView] = useState('companion')
  const [chatOpen, setChatOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('persona')
  const [dressupOpen, setDressupOpen] = useState(false)
  const [autoplay, setAutoplay] = useState(localStorage.getItem('xinyu_autoplay') !== '0')
  // Always start a fresh companion visit with the mic enabled. Mute is session-local.
  const [hfOn, setHfOn] = useState(true)
  const [hfState, setHfState] = useState('connecting')
  const [micLevel, setMicLevel] = useState(0)
  const [retry, setRetry] = useState(0)
  const [silenceMs, setSilenceMs] = useState(Number(localStorage.getItem('xinyu_pause_ms')) || 1000)
  // Opt-in is session-local: do not silently restore headphone mode on speakers.
  const [headphones, setHeadphones] = useState(false)
  useEffect(() => {
    const changed = () => setHeadphones(false)
    navigator.mediaDevices?.addEventListener('devicechange', changed)
    return () => navigator.mediaDevices?.removeEventListener('devicechange', changed)
  }, [])
  const activeTurn = useRef(null)
  const micRef = useRef(null)
  const stateRef = useRef('idle')
  const turnNumber = useRef(0)
  const clientId = useRef(crypto.randomUUID())
  const sendRef = useRef(null)
  const autoplayRef = useRef(autoplay)
  const changeState = s => { stateRef.current = s; setHfState(s) }
  useEffect(() => { autoplayRef.current = autoplay }, [autoplay])

  const refresh = async () => {
    const s = await api.state()
    setBoot(s); setCompanion(s.companion); setMessages(s.messages || [])
    setAffection(s.affection ?? 10); setLevel(s.level || '初识')
    if (s.messages?.length) {
      const recent = s.messages
      const user = [...recent].reverse().find(m => m.role === 'user')
      const ai = [...recent].reverse().find(m => m.role === 'assistant')
      setTalk(t => t || { user: user?.content, ai: ai?.content })
    }
    if (!s.companion) { setSettingsOpen(false); setDressupOpen(false); setChatOpen(false) }
  }
  useEffect(() => { refresh().catch(e => setBoot({ error: e.message })) }, [])

  const interrupt = (show = false) => {
    const previous = activeTurn.current
    turnNumber.current++
    activeTurn.current = null
    previous?.abort()
    stopSpeaking()
    setSpeechCaption('')
    if (previous?.clientId) api.cancel(previous.clientId).catch(() => {})
    setSending(false)
    if (show) { setTalk(t => t ? { ...t, interrupted: true } : t); changeState('hearing') }
  }

  const sendText = async (text, opts = {}) => {
    text = (text || '').trim()
    if (!text) return
    if (!boot.llm_ready && !isOnlineQuery(text) && !boot.weather_pending) { setErr('请先连接对话模型，再开始聊天。'); openSettings('connect'); return }
    interrupt()
    const controller = new AbortController()
    activeTurn.current = controller
    const id = ++turnNumber.current
    controller.clientId = clientId.current + '-' + id
    const current = () => !controller.signal.aborted && turnNumber.current === id
    setErr(''); setSending(true); changeState('thinking')
    setMessages(m => [...m, { id: 'u' + id + Date.now(), role: 'user', content: text }])
    setTalk({ user: text, ai: null })
    try {
      const r = await api.chat(text, { signal: controller.signal, clientId: controller.clientId, voice: !!opts.voice, profileId: boot.profile_id })
      if (!current()) return
      if (r.warning && !r.reply) {
        setErr(r.warning); setTalk({ user: text, ai: null, failed: true }); return
      }
      setMessages(m => [...m, { id: 'a' + id + Date.now(), role: 'assistant', content: r.reply, online: r.online }])
      setBoot(b => ({...b, weather_pending: !!r.online?.pending_weather}))
      setTalk({ user: text, ai: r.reply }); setAffection(r.affection); setLevel(r.level)
      if (r.warning) setErr(r.warning)
      if (opts.voice || autoplayRef.current) {
        changeState('preparing')
        try {
          const played = await speak(r.speech_text || r.reply, { signal: controller.signal, onPlaying: text => { if (current()) { setSpeechCaption(text); changeState('speaking') } } })
          if (!played && current()) setErr('语音未能播放，你可以查看字幕或稍后重试。')
        } catch (e) { if (current()) setErr('语音暂时不可用，回复已显示在字幕中。') }
      }
    } catch (e) { if (current()) setErr('回复失败：' + e.message) }
    finally {
      if (current()) { activeTurn.current = null; setSending(false); setSpeechCaption(''); changeState(micRef.current ? 'listening' : 'idle') }
    }
  }
  sendRef.current = sendText

  const callActive = !!companion && view === 'companion' && hfOn && !settingsOpen && !dressupOpen && !chatOpen
  useEffect(() => {
    if (!callActive) { changeState('idle'); setMicLevel(0); return }
    let disposed = false
    changeState('connecting'); setErr(previous => /模型|密钥|服务/.test(previous) ? previous : '')
    const mic = new ContinuousMic({
      silenceMs,
      headphones: () => headphones,
      isBusy: () => !!activeTurn.current || !!window.__xinyuSpeaking,
      onLevel: v => { if (!disposed) setMicLevel(v) },
      onSpeechStart: () => { if (!disposed) { setErr(''); interrupt(true) } },
      onUtterance: async blob => {
        if (disposed) return
        const controller = new AbortController()
        activeTurn.current = controller
        const id = ++turnNumber.current
        const current = () => !disposed && !controller.signal.aborted && id === turnNumber.current
        changeState('transcribing')
        try {
          const text = await transcribe(blob, controller.signal)
          if (!current()) return
          activeTurn.current = null
          if (text.trim()) await sendRef.current(text, { voice: true })
          else { setErr('这句没听清，可以直接再说一次。'); changeState('listening') }
        } catch (e) {
          if (current()) { activeTurn.current = null; setErr('识别失败：' + e.message); changeState('listening') }
        }
      },
      onError: e => { if (!disposed) { mic.stop(); interrupt(); setErr(e.message); changeState('error') } },
    })
    micRef.current = mic
    mic.start().then(() => { if (!disposed) changeState('listening') }).catch(e => {
      if (!disposed) {
        mic.stop()
        setErr(e.name === 'NotAllowedError' ? '麦克风权限未开启，请在 Windows 设置中允许桌面应用使用麦克风，然后点击重试。' : e.name === 'NotFoundError' ? '没有找到麦克风，请连接麦克风后点击重试。' : '麦克风启动失败：' + e.message)
        changeState('error')
      }
    })
    return () => {
      disposed = true; mic.stop()
      if (micRef.current === mic) micRef.current = null
      interrupt(); setMicLevel(0)
    }
  }, [callActive, boot?.profile_id, companion?.char, retry, silenceMs, headphones])

  const navigate = target => {
    if (target !== view) interrupt()
    if (target === 'companion' && view !== 'companion') { setHfOn(true); setRetry(x => x + 1) }
    setView(target)
  }
  const selectCharacter = async cid => {
    const c = charById(cid)
    if (!c) return
    interrupt()
    try {
      const existing = boot.profiles?.find(p => p.char === cid)
      if (existing) await api.switchProfile(existing.id)
      else await api.createProfile({ char: cid, name: c.name, personality: c.personality, gender: c.gender, voice: c.voice, relationship: '知己', petname: companion.petname || '你' })
      setTalk(null); await refresh(); navigate('companion')
    } catch (e) { setErr('选择失败：' + e.message) }
  }
  const openOverlay = setter => { interrupt(); setter(true) }
  const openSettings = (tab = 'persona') => { setSettingsTab(tab); openOverlay(setSettingsOpen) }
  const toggleMic = () => { interrupt(); setHfOn(v => !v) }
  const changePause = value => { localStorage.setItem('xinyu_pause_ms', value); setSilenceMs(Number(value)) }

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        interrupt()
        if (settingsOpen) setSettingsOpen(false)
        else if (dressupOpen) setDressupOpen(false)
        else if (chatOpen) setChatOpen(false)
      }
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyM' && view === 'companion') { e.preventDefault(); toggleMic() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, dressupOpen, chatOpen, view])

  if (!boot) return <div className="boot"><div className="boot-heart">♡</div><div className="boot-text">心屿正在醒来…</div></div>
  if (boot.error) return <div className="boot"><div className="boot-text">连接失败：{boot.error}</div><button className="btn" onClick={() => { setBoot(null); refresh().catch(e => setBoot({ error: e.message })) }}>重新连接</button></div>
  if (boot.version !== UI_VERSION) return <div className="boot"><div className="boot-text">页面与服务版本不一致，请重新载入。</div><button className="btn" onClick={() => { const u = new URL(location.href); u.searchParams.set('refresh', Date.now()); location.replace(u.href) }}>重新载入页面</button></div>
  if (!companion) return <Wizard boot={boot} onDone={async () => { await refresh(); navigate('companion'); if (!boot.llm_ready) openSettings('connect') }} />

  return <div className="home refined-home">
    <TabBar view={view} onChange={navigate} version={UI_VERSION} />
    <main className="page-shell">
      {view === 'home' && <HomeHub profiles={boot.profiles || []} activeProfile={boot.profile_id} companion={companion} onSelect={selectCharacter} onSwitchProfile={async id => {interrupt();try{await api.switchProfile(id);setTalk(null);await refresh();navigate('companion')}catch(e){setErr(e.message)}}} onGoCompanion={() => navigate('companion')} onGoPet={() => navigate('pet')} />}
      {view === 'companion' && <Stage companion={companion} affection={affection} level={level} talk={talk}
        hfOn={hfOn} hfState={hfState} micLevel={micLevel} err={err} modelReady={boot.llm_ready} version={UI_VERSION} onRetry={() => { setHfOn(true); setRetry(x => x + 1) }}
        onToggleHf={toggleMic} onInterrupt={() => { interrupt(true); changeState('listening') }}
        onOpenSettings={() => openSettings()} onOpenConnection={() => openSettings('connect')} onOpenDressup={() => openOverlay(setDressupOpen)}
        onVoiceText={t => sendText(t, { voice: true })} onOpenTextChat={() => window.dispatchEvent(new Event('xinyu-focus-chat'))}>
        <Chat key={boot.profile_id} boot={boot} companion={companion} messages={messages} sending={sending} err={err} autoplay={autoplay}
          onToggleAutoplay={() => setAutoplay(v => { localStorage.setItem('xinyu_autoplay', v ? '0' : '1'); return !v })}
          onSend={sendText} hfOn={hfOn} hfState={hfState} micLevel={micLevel} onToggleHf={toggleMic} headphones={headphones} speechCaption={speechCaption}
          onInterrupt={() => { interrupt(); changeState(micRef.current ? 'listening' : 'idle') }}
          onOpenConnection={() => openSettings('connect')} onRetry={() => {setHfOn(true);setRetry(v => v + 1)}}
          onMemorySaved={async () => {const s = await api.state();setBoot(s)}} />
      </Stage>}
      {view === 'memory' && <MemoryPage companion={companion} onRefresh={async () => {const s=await api.state();setBoot(s)}} />}
      {view === 'pet' && <PetPage />}
      {view === 'mine' && <MinePage companion={companion} affection={affection} level={level} messageCount={Math.max(boot.message_count || 0, messages.length)} memoryCount={boot.memory_count || 0} onOpenDressup={() => openOverlay(setDressupOpen)} version={UI_VERSION} onOpenMemory={() => navigate('memory')} onOpenSettings={openSettings} />}
    </main>
    {err && view !== 'companion' && !chatOpen && <div className="app-notice" role="alert">{err}</div>}
    <DressupPanel open={dressupOpen} onClose={() => setDressupOpen(false)} companion={companion} onSaved={refresh} imageReady={boot.image_ready} />
    <SettingsModal open={settingsOpen} initialTab={settingsTab} onClose={() => setSettingsOpen(false)} boot={boot} companion={companion} setCompanion={setCompanion}
      onRefresh={refresh} affection={affection} silenceMs={silenceMs} onChangePause={changePause} headphones={headphones} onChangeHeadphones={setHeadphones} />
  </div>
}
