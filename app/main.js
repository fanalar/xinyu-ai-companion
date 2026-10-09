// 心屿 · AI恋人 —— Electron 主进程
const { app, BrowserWindow, dialog, shell, session } = require('electron')
const { spawn, execSync } = require('child_process')
const path = require('path')
const http = require('http')
const fs = require('fs')
const net = require('net')
const { randomUUID } = require('crypto')
const bootId = randomUUID()
if (process.env.XINYU_PROFILE_DIR) app.setPath('userData', process.env.XINYU_PROFILE_DIR)

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let PORT = parseInt(process.env.XINYU_PORT || '8123', 10)
let pyProc = null
let win = null

function dataDir() {
  const d = process.env.XINYU_DATA_DIR || path.join(app.getPath('userData'), 'data')
  fs.mkdirSync(d, { recursive: true })
  return d
}

function resolveBackend() {
  const rd = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..')
  if (app.isPackaged) {
    const exe = path.join(rd, 'backend', 'backend.exe')
    return { cmd: exe, args: [], cwd: path.dirname(exe) }
  }
  if (process.env.XINYU_DEV_PY) return { cmd: process.env.XINYU_DEV_PY, args: [path.join(rd, 'backend', 'main.py')], cwd: path.join(rd, 'backend') }
  const py = process.platform === 'win32'
    ? path.join(rd, 'backend', '.venv', 'Scripts', 'python.exe')
    : path.join(rd, 'backend', '.venv', 'bin', 'python')
  const script = path.join(rd, 'backend', 'main.py')
  return { cmd: py, args: [script], cwd: path.join(rd, 'backend') }
}

function choosePort() {
  return new Promise(resolve => {
    const probe = net.createServer()
    probe.on('error', () => {
      const spare = net.createServer()
      spare.listen(0, '127.0.0.1', () => { PORT = spare.address().port; spare.close(resolve) })
    })
    probe.listen(PORT, '127.0.0.1', () => probe.close(resolve))
  })
}

function startBackend() {
  const { cmd, args, cwd } = resolveBackend()
  const env = { ...process.env, XINYU_DATA_DIR: dataDir(), XINYU_PORT: String(PORT), XINYU_BOOT_ID: bootId, PYTHONIOENCODING: 'utf-8' }
  pyProc = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
  pyProc.stdout.on('data', (d) => console.log('[backend]', d.toString().trim()))
  pyProc.stderr.on('data', (d) => console.log('[backend]', d.toString().trim()))
  pyProc.on('exit', (code) => { console.log('[backend] exited', code); pyProc = null })
}

function health() {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/health', timeout: 1500 }, (res) => {
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => {
        try { const h = JSON.parse(body); resolve(res.statusCode === 200 && h.version === app.getVersion() && h.boot_id === bootId) }
        catch { resolve(false) }
      })
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
  })
}

async function waitBackend(maxMs = 40000) {
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    if (await health()) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

function killBackend() {
  if (!pyProc) return
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pyProc.pid} /T /F`, { stdio: 'ignore' })
    } else {
      pyProc.kill('SIGTERM')
    }
  } catch (e) { /* ignore */ }
  pyProc = null
}

async function createWindow() {
  win = new BrowserWindow({
    show: !process.argv.includes('--xinyu-test-headless'),
    width: 1060,
    height: 780,
    minWidth: 390,
    minHeight: 580,
    title: '心屿 · AI恋人',
    autoHideMenuBar: true,
    backgroundColor: '#f7f3ee',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  win.on('closed', () => { win = null })
  const ok = await waitBackend()
  if (!ok) {
    dialog.showErrorBox('启动失败', '后端服务未能在 40 秒内启动。\n请检查是否缺少依赖或端口被占用。')
    app.quit()
    return
  }
  // A cached index from the old installation can otherwise load an old UI
  // against the new backend. Keep local storage, but give each launch a fresh URL.
  win.loadURL(`http://127.0.0.1:${PORT}/?ui=${encodeURIComponent(app.getVersion())}&launch=${bootId}`, { extraHeaders: 'Cache-Control: no-cache\n' })
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' } })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus() } })
  app.whenReady().then(() => {
    // 允许麦克风等媒体权限（个人桌面应用）
    const allowed = (origin) => origin === `http://127.0.0.1:${PORT}`
    session.defaultSession.setPermissionCheckHandler((wc, permission, origin, details) => permission === 'media' && allowed(origin) && details?.mediaType !== 'video')
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) => {
      const kinds = details.mediaTypes || []
      cb(permission === 'media' && allowed(new URL(wc.getURL()).origin) && kinds.every(k => k === 'audio'))
    })
    choosePort().then(() => { startBackend(); createWindow() })
  })
  app.on('window-all-closed', () => { killBackend(); app.quit() })
  app.on('before-quit', () => killBackend())
}
