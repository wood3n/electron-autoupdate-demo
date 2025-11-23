const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateMessage: (cb) => {
    const listener = (_, payload) => cb(payload)
    ipcRenderer.on('update-message', listener)
    return () => ipcRenderer.removeListener('update-message', listener)
  }
})

