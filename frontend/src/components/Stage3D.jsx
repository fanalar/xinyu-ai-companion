import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import { applyLook } from '../lib/avatarLook.js'
import MicButton from './MicButton.jsx'
import './stage.css'

export default function Stage3D({ companion, affection, level, talk, hfOn, hfState, onToggleHf, onOpenChat, onOpenSettings, onOpenDressup, onVoiceText }) {
  const mountRef = useRef(null)
  const [status, setStatus] = useState('正在唤醒…')
  const [err, setErr] = useState('')

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(26, mount.clientWidth / mount.clientHeight, 0.1, 30)
    camera.position.set(0, 1.05, 3.5)
    camera.lookAt(0, 0.76, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x554466, 1.15))
    const key = new THREE.DirectionalLight(0xfff2f6, 1.5)
    key.position.set(1.2, 2.0, 1.6)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xa06bff, 0.9)
    rim.position.set(-1.4, 1.4, -1.6)
    scene.add(rim)

    // 地面柔和阴影
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = shadowCanvas.height = 256
    {
      const g = shadowCanvas.getContext('2d')
      const rad = g.createRadialGradient(128, 128, 8, 128, 128, 122)
      rad.addColorStop(0, 'rgba(0,0,0,0.5)')
      rad.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = rad
      g.fillRect(0, 0, 256, 256)
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas)
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 1.05),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.002
    scene.add(shadow)

    let vrm = null
    let disposed = false
    let raf = 0
    const clock = new THREE.Clock()
    let blinkClock = 0
    let nextBlink = 2.5
    let blinkVal = 0
    let lipSmooth = 0

    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))
    loader.load('/models/sample.vrm', (gltf) => {
      if (disposed) return
      try {
        vrm = gltf.userData.vrm
        try { VRMUtils.removeUnnecessaryVertices(gltf.scene) } catch (e) { /* older api */ }
        try { VRMUtils.combineSkeletons(gltf.scene) } catch (e) { /* older api */ }
        if (vrm.meta && vrm.meta.metaVersion === '0') {
          try { VRMUtils.rotateVRM0(vrm) } catch (e) { /* ignore */ }
        }
        vrm.scene.traverse((o) => { o.frustumCulled = false })
        scene.add(vrm.scene)
        // 自然站姿：放下双臂（从 T-pose 到自然垂放）
        try {
          const h = vrm.humanoid
          const la = h.getNormalizedBoneNode('leftUpperArm')
          const ra = h.getNormalizedBoneNode('rightUpperArm')
          if (la) la.rotation.z = -1.38
          if (ra) ra.rotation.z = 1.38
        } catch (e) { /* 保持默认姿态 */ }
        // 调试/定制勾子：暴露 VRM 与材质清单
        try {
          const mats = []
          vrm.scene.traverse((o) => {
            if (!o.material) return
            const ms = Array.isArray(o.material) ? o.material : [o.material]
            ms.forEach((mm) => {
              if (!mats.find((x) => x.uuid === mm.uuid)) {
                mats.push({ name: mm.name || '', type: mm.type, hasMap: !!mm.map })
              }
            })
          })
          window.__xinyu_vrm = vrm
          window.__xinyu_mats = mats
          window.__xinyuApplyLook = (lk) => applyLook(vrm, lk)
          applyLook(vrm, companion.look)
          console.log('XINYU_MATERIALS', JSON.stringify(mats))
        } catch (e) { /* ignore */ }
        setStatus('')
      } catch (e) {
        setErr('模型初始化失败：' + e)
      }
    }, undefined, (e) => setErr('模型加载失败：' + (e && e.message ? e.message : e)))

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(clock.getDelta(), 0.1)
      const t = clock.elapsedTime
      if (vrm) {
        try {
          vrm.update(dt)
          // 待机动画：呼吸起伏 + 轻微摇摆
          vrm.scene.position.y = Math.sin(t * 1.5) * 0.008
          vrm.scene.rotation.z = Math.sin(t * 0.55) * 0.018
          vrm.scene.rotation.y = Math.sin(t * 0.32) * 0.06
          // 眨眼
          blinkClock += dt
          if (blinkClock > nextBlink) {
            const k = (blinkClock - nextBlink) / 0.13
            if (k < 1) blinkVal = k < 0.5 ? k * 2 : (1 - k) * 2
            else { blinkVal = 0; blinkClock = 0; nextBlink = 2.2 + Math.random() * 3.4 }
          } else {
            blinkVal = 0
          }
          if (vrm.expressionManager) {
            try { vrm.expressionManager.setValue('blink', blinkVal) } catch (e) { /* no blink */ }
            // 说话口型（音量驱动）
            const lipTarget = (window.__xinyuLip && window.__xinyuLip.level) || 0
            lipSmooth += (lipTarget - lipSmooth) * 0.45
            const m = Math.min(1, lipSmooth * 1.15)
            try { vrm.expressionManager.setValue('aa', m) } catch (e) { /* no aa */ }
            try { vrm.expressionManager.setValue('ih', Math.min(0.55, m * 0.45)) } catch (e) { /* no ih */ }
          }
        } catch (e) { /* keep rendering */ }
      }
      renderer.render(scene, camera)
    }
    tick()

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      try { ro.disconnect() } catch (e) { /* ignore */ }
      try {
        if (vrm) { VRMUtils.deepDispose(vrm.scene) }
      } catch (e) { /* ignore */ }
      try { renderer.dispose() } catch (e) { /* ignore */ }
      try { mount.removeChild(renderer.domElement) } catch (e) { /* ignore */ }
    }
  }, [])

  return (
    <div className="stage">
      <div className="stage-glow" />
      <div className="stage-canvas" ref={mountRef} />
      {(status || err) && <div className="stage-status">{err || status}</div>}

      <div className="stage-top">
        <div className="stage-info">
          <div className="stage-name">{companion.name}</div>
          <div className="stage-level">❤️ {affection} · {level}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={'icon-btn' + (hfOn ? ' hf-on' : '')} title="免提对话 开/关" onClick={onToggleHf}>🎧</button>
          <button className="icon-btn" title="设置" onClick={onOpenSettings}>⚙️</button>
        </div>
      </div>

      <div className="stage-talk-wrap">
        {talk && talk.user && <div className="stage-bubble user">{talk.user}</div>}
        {talk && talk.ai && <div className="stage-bubble ai">{talk.ai}</div>}
      </div>

      <div className="stage-bottom">
        <button className="stage-btn" onClick={onOpenDressup}>👗 装扮</button>
        {hfOn ? (
          <button className={'stage-btn hf' + (hfState === 'listening' ? ' live' : '')} onClick={onToggleHf}
                  title="免提对话中，点击暂停">
            {hfState === 'listening' ? '🎧 聆听中…' : hfState === 'thinking' ? '🎧 识别中…' : hfState === 'speaking' ? '🎧 说话中…' : '🎧 免提对话'}
          </button>
        ) : (
          <MicButton className="stage-btn" label={companion.gender === 'm' ? '🎙 说给他听' : '🎙 说给她听'} onText={onVoiceText} />
        )}
        <button className="stage-btn primary" onClick={onOpenChat}>💬 聊天</button>
      </div>
    </div>
  )
}
