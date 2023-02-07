const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onMenuButtonClick: (callback) => ipcRenderer.on('onMenuButtonClick', callback),
  saveFileAs: (file) => ipcRenderer.send('saveFileAs', file),
  saveFile: (file) => ipcRenderer.send('saveFile', file),
  handleFileChange: () => ipcRenderer.send('fileHasChanged'),
  handleFileOpen: () => ipcRenderer.send('fileHasOpened'),
})