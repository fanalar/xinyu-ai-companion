import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

export default function ReachSettings() {
  const [data, setData] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const job = useRef(null)
  useEffect(() => {
    const controller = new AbortController(); job.current = controller
    api.reachStatus().then(d => { if (!controller.signal.aborted) setData(d) }).catch(() => { if (!controller.signal.aborted) setError('暂时无法读取来源状态') })
    return () => { job.current?.abort() }
  }, [])
  const probe = async () => {
    if (busy) { job.current?.abort(); setBusy(false); return }
    const controller = new AbortController(); job.current = controller; setBusy(true); setError('')
    try { const d = await api.reachProbe(controller.signal); if (!controller.signal.aborted) setData(d) }
    catch (e) { if (!controller.signal.aborted) setError('检查未完成，请稍后重试') }
    finally { if (job.current === controller) setBusy(false) }
  }
  return <div className="settings-form"><h3>让日常多一点新鲜事</h3><p className="form-note">可以问“播报今天国内外新闻”“查近一周人工智能资讯”“北京明天天气”，也能阅读公开网页、查找开源项目或视频。日期由联网核时和报道时间共同筛选。</p>
    <div className="reach-channels">{data?.channels?.map(c => <div className="reach-channel" key={c.id}><label><input type="checkbox" checked={c.enabled} disabled={busy} onChange={async e => {
      setError(''); try { setData(await api.reachSettings({[c.id]:e.target.checked})) } catch { setError('来源设置未能保存') }
    }}/><span><b>{c.label}</b><small>{c.backend}</small></span></label><div className={'reach-status '+c.status}>{!c.enabled ? '已关闭' : {connected:'已连接',unreachable:'暂不可达',unchecked:'未检查'}[c.status]}<small>{c.note}</small></div></div>)}</div>
    <button className="btn" onClick={probe}>{busy ? '取消检查' : '检查公开资讯来源'}</button><p className="form-note">检查会实际读取公开内容；服务可能限流或暂时不可达。只发送本次查询词或公开链接，不发送私密聊天历史。基础天气与中新新闻始终可独立查询。</p>
    <p className="form-note">使用 Agent-Reach 的公开渠道适配。当前没有接入需登录的小红书、微博或社交账号；视频结果不代表已观看或取得字幕。</p>{error && <p role="alert">{error}</p>}
  </div>
}
