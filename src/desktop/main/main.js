// check for update
const { autoUpdater } = require("electron-updater")
autoUpdater.checkForUpdatesAndNotify()
// import app`s deps
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const isMac = process.platform === 'darwin'
const path = require('path')
const ElectronFileManager = require('./FileManager')
const getLocalization = require('../common/getLocalizationCfg')
const getAppTittle = require('../common/getAppTittle')
const getTemplate = require('./getTemplate')

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
  globalThis.appWindow = win

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
      currentFilePath = opened ? opened.path: undefined
      globalThis.appWindow.setTitle(getAppTittle(opened && opened.path))
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
      globalThis.appWindow.setTitle(getAppTittle())
    }
    else win.webContents.send('onMenuButtonClick', 'newFile')
  }

  // load page
  win.loadFile('./bundles/desktop/index.html')

  // top menu
  const menu = Menu.buildFromTemplate(getTemplate(win, localeCfg, handleNewFile, handleOpenFile))
  Menu.setApplicationMenu(menu)

  win.on('close', (e) => {
    // dont close app while file is being saved
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

  ipcMain.on('newFile', () => {
    currentFilePath = null
    globalThis.appWindow.setTitle(getAppTittle())
  })

  ipcMain.on('saveFileAs', async (_, data) => {
    fileIsSaving = true

    currentFilePath = await ElectronFileManager.saveBase64As(data)

    fileHasChanged = false
    fileIsSaving = false

  })

  ipcMain.on('saveFile', async (_, data) => {
    fileIsSaving = true

    if (currentFilePath) currentFilePath = await ElectronFileManager.saveBase64(data, currentFilePath)
    else currentFilePath = await ElectronFileManager.saveBase64As(data)

    globalThis.appWindow.setTitle(getAppTittle(currentFilePath))
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