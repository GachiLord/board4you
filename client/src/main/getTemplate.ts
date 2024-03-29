import { shell, BrowserWindow } from 'electron'
import { localization } from '../common/localization'

const isMac = process.platform === 'darwin'


export default function(win: BrowserWindow, localeCfg: localization, handleNewFile: () => void, handleOpenFile: () => void){
    const template: Electron.MenuItemConstructorOptions[] = [
        // { role: 'fileMenu' }
        {
          label: localeCfg.fileMenuLabel,
          submenu: [
            { label: localeCfg.create, click: () => { 
              handleNewFile()
            },
              accelerator: 'CommandOrControl+N' },
            { label: localeCfg.open, click: handleOpenFile, accelerator: 'CommandOrControl+O' },
            { type: 'separator'},
            { label: localeCfg.selectSize, click: () => { win.webContents.send('onMenuButtonClick', 'selectSize') }, accelerator: 'CommandOrControl+Shift+L' },
            { type: 'separator'},
            { label: localeCfg.save, click: () => { 
              win.webContents.send('onMenuButtonClick', 'saveFile')
             }, accelerator: 'CommandOrControl+S' },
            { label: localeCfg.saveAs, click: () => { win.webContents.send('onMenuButtonClick', 'saveFileAs') }, accelerator: 'CommandOrControl+Shift+S' },
            { type: 'separator'},
            isMac ? { role: 'close', label: String(localeCfg.file) } : { role: 'quit', label: localeCfg.close }
          ]
        },
        // { role: 'editMenu' }
        {
          label: localeCfg.editMenuLabel,
          submenu: [
            { label: localeCfg.undo, click: () => { win.webContents.send('onMenuButtonClick', 'undo') }, accelerator: 'CommandOrControl+Z' },
            { label: localeCfg.redo, click: () => { win.webContents.send('onMenuButtonClick', 'redo') }, accelerator: 'CommandOrControl+Y' },
            { type: 'separator'},
            { label: localeCfg.cut, click: () => { win.webContents.send('onMenuButtonClick', 'cut') }, accelerator: 'CommandOrControl+X' },
            { label: localeCfg.copy, click: () => { win.webContents.send('onMenuButtonClick', 'copy') }, accelerator: 'CommandOrControl+C' },
            { label: localeCfg.paste, role: 'paste' },
            { label: localeCfg.del, click: () => { win.webContents.send('onMenuButtonClick', 'del') }, accelerator: 'Delete' }
          ]
        },
        // { role: 'viewMenu' }
        {
          label: localeCfg.viewMenuLabel,
          submenu: [
            { role: 'resetZoom', label: localeCfg.resetZoom },
            { role: 'zoomIn', label: localeCfg.zoomIn, accelerator: 'CommandOrControl+=' },
            { role: 'zoomOut', label: localeCfg.zoomOut, accelerator: 'CommandOrControl+-' },
            { type: 'separator' },
            { role: 'togglefullscreen', label: localeCfg.fullscreen },
            { role: 'toggleDevTools', label: localeCfg.devTools },
          ]
        },
        // { role: 'windowMenu' }
        {
          role: 'help',
          label: localeCfg.help,
          submenu: [
            {
              label: localeCfg.learnMore,
              click: async () => {
                await shell.openExternal('https://github.com/GachiLord/board4you')
              }
            }
          ]
        }
    ]

    return template
}