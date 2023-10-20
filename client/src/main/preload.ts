import { contextBridge, ipcRenderer } from 'electron'
import ISize from '../renderer/base/typing/ISize'

contextBridge.exposeInMainWorld('electronAPI', {
  onMenuButtonClick: (callback: () => void) => ipcRenderer.on('onMenuButtonClick', callback),
  saveFileAs: (file: any) => ipcRenderer.send('saveFileAs', file),
  saveFile: (file: any) => ipcRenderer.send('saveFile', file),
  handleFileChange: () => ipcRenderer.send('fileHasChanged'),
  handleFileOpen: () => ipcRenderer.send('fileHasOpened'),
  hadleNewFile: () => ipcRenderer.send('newFile'),
  setCanvasSize: (value: ISize) => ipcRenderer.send('setCanvasSize', value),
  removeAllListeners: () => ipcRenderer.removeAllListeners('')
})