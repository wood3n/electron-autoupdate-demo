function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2))
  return `${value} ${sizes[i]}`
}

const statusEl = document.getElementById('status')
const progressEl = document.getElementById('progress')
const logEl = document.getElementById('log')
const btnCheck = document.getElementById('btnCheck')
const btnDownload = document.getElementById('btnDownload')
const btnInstall = document.getElementById('btnInstall')

function appendLog(line) {
  logEl.textContent += `\n${line}`
}

window.api.onUpdateMessage(msg => {
  switch (msg.type) {
    case 'checking':
      statusEl.textContent = '正在检查更新…'
      appendLog('正在检查更新…')
      break
    case 'available':
      statusEl.textContent = `发现更新：v${msg.info?.version}`
      btnDownload.disabled = false
      appendLog(`发现更新：${JSON.stringify(msg.info, null, 2)}`)
      break
    case 'none':
      statusEl.textContent = '暂无可用更新'
      appendLog('暂无可用更新')
      break
    case 'progress':
      const { percent, transferred, total, bytesPerSecond } = msg.progress
      progressEl.textContent = `${percent.toFixed(1)}%  ${formatBytes(transferred)} / ${formatBytes(total)}  @ ${formatBytes(bytesPerSecond)}/s`
      break
    case 'downloaded':
      statusEl.textContent = '更新包已下载'
      btnInstall.disabled = false
      appendLog('更新包已下载，点击“退出并安装”立即更新')
      break
    case 'error':
      statusEl.textContent = '更新出错'
      appendLog(`错误：${msg.error}`)
      break
    default:
      appendLog(JSON.stringify(msg))
  }
})

btnCheck.addEventListener('click', async () => {
  const res = await window.api.checkForUpdates()
  if (!res.ok) appendLog(`检查失败：${res.error}`)
})

btnDownload.addEventListener('click', async () => {
  btnDownload.disabled = true
  const res = await window.api.downloadUpdate()
  if (!res.ok) appendLog(`下载失败：${res.error}`)
})

btnInstall.addEventListener('click', async () => {
  const res = await window.api.quitAndInstall()
  if (!res.ok) appendLog(`安装失败：${res.error}`)
})

