const path = require('path')
const { execFileSync } = require('child_process')
module.exports = async context => {
  if (context.electronPlatformName !== 'win32') return
  const editor = process.env.XINYU_RCEDIT
  if (!editor) throw new Error('Set XINYU_RCEDIT to the Windows rcedit helper before building')
  const exe = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.exe')
  execFileSync(editor, [exe, '--set-icon', path.join(context.packager.projectDir, 'build', 'icon.ico'),
    '--set-version-string', 'ProductName', '心屿AI恋人',
    '--set-version-string', 'FileDescription', '心屿 · AI恋人',
    '--set-file-version', context.packager.appInfo.version, '--set-product-version', context.packager.appInfo.version], { windowsHide: true })
}

