import React, { useState } from 'react'
import { startRec, stopRec, transcribe } from '../lib/recorder.js'

/** 语音输入按钮：点击开始录音 → 再点结束 → 识别 → onText(text) */
export default function MicButton({ onText, className = 'stage-btn', label = '🎙 语音', short = false }) {
  const [st, setSt] = useState('idle') // idle | rec | busy

  const click = async () => {
    try {
      if (st === 'idle') {
        await startRec()
        setSt('rec')
      } else if (st === 'rec') {
        setSt('busy')
        const blob = await stopRec()
        const text = await transcribe(blob)
        setSt('idle')
        if (text) onText && onText(text)
      }
    } catch (e) {
      setSt('idle')
      console.error('voice failed:', e)
      alert('语音识别失败：' + (e && e.message ? e.message : e))
    }
  }

  return (
    <button
      className={className + (st === 'rec' ? ' rec' : '') + (st === 'busy' ? ' busy' : '')}
      onClick={click}
      disabled={st === 'busy'}
      title="点击说话，再点结束"
    >
      {st === 'rec' ? (short ? '🔴' : '🔴 说完点这里') : st === 'busy' ? (short ? '…' : '识别中…') : label}
    </button>
  )
}
