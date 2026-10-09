import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { CHARACTERS, charFile } from '../lib/characters.js'
import Icon from './Icon.jsx'

export default function DressupPanel({ open, onClose, companion, onSaved, imageReady }) {
  const [charSel, setCharSel] = useState((companion && companion.char) || null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    if (open) {
      setCharSel((companion && companion.char) || null)
      setMsg('')
    }
  }, [open])

  if (!open) return null

  const dirty = charSel && (charSel !== (companion && companion.char) || companion.avatar)

  const save = async () => {
    setSaving(true)
    try {
      await api.saveCompanion({ char: charSel, avatar: '' })
      setMsg('已保存 ✓')
      if (onSaved) await onSaved()
      if (onClose) onClose()
    } catch (e) {
      setMsg('保存失败：' + e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-mask" onClick={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span>装扮工坊</span>
          <button className="icon-btn" aria-label="关闭装扮" onClick={onClose}><Icon name="close"/></button>
        </div>
        <div className="modal-body">
          <div className="sec-title">给 TA 换一个样子</div><p className="form-note">这里仅更换形象，名字、性格、声音和记忆都会保留。</p>
          <div className="char-grid">
            {CHARACTERS.map((c) => (
              <button key={c.id} type="button" className={'char-item' + (charSel === c.id ? ' on' : '')}
                   onClick={() => setCharSel(c.id)}>
                <img src={charFile(c.id)} alt="" />
                <div className="char-t">{c.name} · {c.title}</div>
              </button>
            ))}
          </div>
          <button className="btn wide" disabled={saving || !dirty} onClick={save}>
            {saving ? '保存中…' : '保存形象'}
          </button>
          {msg && <div className="hint-ok center">{msg}</div>}
          <div className="sec-title">创作专属形象</div>
          <p className="form-note">描述你喜欢的样子，生成后会显示在陪伴舞台上。自定义图片作为静态形象显示。</p>
          <textarea className="big-input" rows={2} value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={120} placeholder="例如：短发，米色针织衫，坐在阳光下，温柔的笑容" />
          <button className="btn wide" disabled={saving || !imageReady || !prompt.trim()} onClick={async () => {
            setSaving(true);setMsg('正在绘制专属形象…')
            try { await api.generateAvatar(prompt); if (onSaved) await onSaved(); setMsg('专属形象已更新'); if (onClose) onClose() }
            catch(e) {setMsg('生成失败：'+e.message)} finally {setSaving(false)}
          }}>{saving ? '绘制中…' : '生成专属形象'}</button>
          {!imageReady && <p className="form-note">形象生成需要配置图像服务；当前可直接使用六款预设形象。</p>}

        </div>
      </div>
    </div>
  )
}
