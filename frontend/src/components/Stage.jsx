import React from 'react'
import Stage2D from './Stage2D.jsx'

/** 舞台路由：默认 2D 立绘（无 char 时按性别给默认形象）；Stage3D 保留备用 */
export default function Stage(props) {
  const c = props.companion
  if (!c) return null
  const charId = c.char || (c.gender === 'm' ? 'm1' : 'f3')
  return <Stage2D {...props} charId={charId} />
}
