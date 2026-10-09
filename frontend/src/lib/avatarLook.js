// 虚拟人外观系统：材质重着色（发色/瞳色）+ 服装换色
import * as THREE from 'three'

export const HAIR_STYLES = [
  { id: 'native', label: '原色' },
  { id: 'brown', label: '蜜棕', filter: 'saturate(1.2) brightness(1.15)' },
  { id: 'black', label: '墨黑', filter: 'saturate(0.4) brightness(0.4)' },
  { id: 'gold', label: '亚麻金', filter: 'saturate(1.0) brightness(1.7) hue-rotate(-8deg)' },
  { id: 'pink', label: '樱粉', filter: 'hue-rotate(300deg) saturate(1.3) brightness(1.75)' },
  { id: 'purple', label: '紫罗兰', filter: 'hue-rotate(258deg) saturate(1.25) brightness(1.6)' },
  { id: 'blue', label: '雾蓝', filter: 'hue-rotate(185deg) saturate(1.25) brightness(1.65)' },
  { id: 'white', label: '雪白', filter: 'saturate(0) brightness(2.1)' },
]

export const EYE_STYLES = [
  { id: 'native', label: '原色' },
  { id: 'amber', label: '琥珀', filter: 'saturate(1.35) hue-rotate(-12deg) brightness(1.12)' },
  { id: 'blue', label: '湛蓝', filter: 'hue-rotate(190deg) saturate(1.45) brightness(1.15)' },
  { id: 'green', label: '青绿', filter: 'hue-rotate(118deg) saturate(1.25)' },
  { id: 'purple', label: '梦幻紫', filter: 'hue-rotate(250deg) saturate(1.35)' },
  { id: 'red', label: '绯红', filter: 'hue-rotate(332deg) saturate(1.5) brightness(1.05)' },
]

export const TOP_COLORS = [
  { id: 'native', label: '原白', hex: '#ffffff' },
  { id: 'pink', label: '樱粉', hex: '#ff9ec7' },
  { id: 'blue', label: '天蓝', hex: '#8fb7ff' },
  { id: 'mint', label: '薄荷', hex: '#a8e6cf' },
  { id: 'yellow', label: '奶黄', hex: '#ffe08a' },
  { id: 'purple', label: '丁香紫', hex: '#c9a8ff' },
  { id: 'red', label: '蜜桃红', hex: '#ff9a9a' },
  { id: 'gray', label: '烟灰', hex: '#9a9ab0' },
]

function makeTexture(orig, filter) {
  const img = orig && orig.image
  if (!img || !img.width) return null
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d')
  try { g.filter = filter && filter !== 'none' ? filter : 'none' } catch (e) { /* ignore */ }
  g.drawImage(img, 0, 0, c.width, c.height)
  const t = new THREE.CanvasTexture(c)
  t.flipY = orig.flipY
  t.colorSpace = orig.colorSpace
  t.wrapS = orig.wrapS
  t.wrapT = orig.wrapT
  t.needsUpdate = true
  return t
}

/** 应用外观（幂等：始终从原始贴图重新生成，可反复切换） */
export function applyLook(vrm, look) {
  if (!vrm || !vrm.scene) return
  look = look || {}
  try { window.__xinyuLook = look } catch (e) { /* ignore */ }
  const hair = HAIR_STYLES.find((x) => x.id === (look && look.hair)) || HAIR_STYLES[0]
  const eye = EYE_STYLES.find((x) => x.id === (look && look.eye)) || EYE_STYLES[0]
  const top = TOP_COLORS.find((x) => x.id === (look && look.top)) || TOP_COLORS[0]
  vrm.scene.traverse((o) => {
    if (!o.material) return
    const ms = Array.isArray(o.material) ? o.material : [o.material]
    ms.forEach((m) => {
      const name = m.name || ''
      if (!m.userData) m.userData = {}
      if (name.includes('HAIR') && !name.includes('Outline')) {
        if (!m.userData.__origMap && m.map) m.userData.__origMap = m.map
        if (m.userData.__origMap) {
          const t = makeTexture(m.userData.__origMap, hair.filter)
          if (t) { m.map = t; m.needsUpdate = true }
        }
      } else if (name.includes('EyeIris')) {
        if (!m.userData.__origMap && m.map) m.userData.__origMap = m.map
        if (m.userData.__origMap) {
          const t = makeTexture(m.userData.__origMap, eye.filter)
          if (t) { m.map = t; m.needsUpdate = true }
        }
      } else if (name.includes('Tops') || name.includes('Bottoms')) {
        if (!m.userData.__origColor) m.userData.__origColor = m.color.clone()
        m.color.set(top.hex)
        m.needsUpdate = true
      }
    })
  })
}
