// check for update
const { autoUpdater } = require("electron-updater")
autoUpdater.checkForUpdatesAndNotify()
// import app`s deps
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const isMac = process.platform === 'darwin'
const path = require('path')
const ElectronFileManager = require('../model/ElectronFileManager')
const getLocalization = require('../lib/CommonGetLocalizationCfg')

// state vars
let currentFilePath = null
let fileHasChanged = false
let fileIsSaving = false


function createWindow() {
  const localeCfg = globalThis.localizationCfg

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // dialog stuff

  function exitAlert(){
    const response = dialog.showMessageBoxSync(win, {
      message: localeCfg.exitAlertMsg,
      buttons: localeCfg.exitAlertOptions,
    })

    if ( response === 0 ) return true
    else return false
  }

  async function handleOpenFile(){
    let open = async () => {
      let opened = await ElectronFileManager.openFilesAsBase64Images()

      win.webContents.send('onMenuButtonClick', 'openFile', opened )
      currentFilePath = opened.path
      fileHasChanged = false
    }

    if (!fileHasChanged) open()
    else if(!exitAlert()) open()

  }

  async function handleNewFile(){
    if ( fileHasChanged && !fileIsSaving ) {
      if (exitAlert()) e.preventDefault()
      win.webContents.send('onMenuButtonClick', 'newFile')
      currentFilePath = null 
    }
  }

  // load page
  win.loadFile('./bundles/desktop/index.html')

  // top menu
  const template = [
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
        { label: localeCfg.selectSize, click: () => { win.webContents.send('onMenuButtonClick', 'selectSize') }, accelerator: 'CommandOrControl+L' },
        { type: 'separator'},
        { label: localeCfg.save, click: () => { 
          win.webContents.send('onMenuButtonClick', 'saveFile')
         }, accelerator: 'CommandOrControl+S' },
        { label: localeCfg.saveAs, click: () => { win.webContents.send('onMenuButtonClick', 'saveFileAs') }, accelerator: 'CommandOrControl+Shift+S' },
        { type: 'separator'},
        isMac ? { role: 'close', label: localeCfg.file } : { role: 'quit', label: localeCfg.close }
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
            const { shell } = require('electron')
            await shell.openExternal('https://github.com/GachiLord/board4you')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  win.on('close', (e) => {
    // dont close app while file is saving
    if ( fileIsSaving && currentFilePath !== null ) e.preventDefault()
    // dont close app if there are unsaved changes
    if ( fileHasChanged && !fileIsSaving ) {
      if (exitAlert()) e.preventDefault()
    }
  })
}

app.whenReady().then(() => {
  globalThis.localizationCfg = getLocalization(app.getLocale())

  if (isMac) app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
  else createWindow()

  // msgs listeners  

  ipcMain.on('setCanvasSize', ( _, value ) => {
    globalThis.CanvasSize = value
  } )

  ipcMain.on('saveFileAs', async (_, data) => {
    fileIsSaving = true

    currentFilePath = await ElectronFileManager.saveBase64As(data)

    fileHasChanged = false
    fileIsSaving = false

  })

  ipcMain.on('saveFile', async (_, data) => {
    fileIsSaving = true

    if (currentFilePath !== null) await ElectronFileManager.saveBase64(data, currentFilePath)
    else currentFilePath = await ElectronFileManager.saveBase64As(data)

    fileHasChanged = false
    fileIsSaving = false
  })

  ipcMain.on('fileHasChanged', () => {
    fileHasChanged = true
  })
  
  ipcMain.on('fileHasOpened', () => {
    fileHasChanged = false
  })

})


app.on('window-all-closed', () => {
  if (isMac !== 'darwin') {
    app.quit()
  }
})