/* eslint-disable no-var */
// check for update
import { autoUpdater } from "electron-updater"
autoUpdater.checkForUpdatesAndNotify()
// import app`s deps
import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron'
const isMac = process.platform === 'darwin'
import path from 'path'
import ElectronFileManager from './FileManager'
import getLocalization from '../common/getLocalizationCfg'
import getAppTittle from '../common/getAppTittle'
import getTemplate from './getTemplate'
import getPathFromArgs from "./getPathFromArgs"
import FileManager from "./FileManager"
import ISize from "../renderer/base/typing/ISize"


declare global {
  var localizationCfg: any
  var CanvasSize: ISize
  var appWindow: BrowserWindow
}

// prepare args
if (app.isPackaged) {
  process.argv.unshift(null)
}

// state vars
let currentFilePath:string = null
let fileHasChanged = false
let fileIsSaving = false


function createWindow() {
  const localeCfg = globalThis.localizationCfg

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
    const open = async () => {
      const opened = await ElectronFileManager.openFilesAsBase64Images()

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
      if (exitAlert()) return//e.preventDefault()
      win.webContents.send('onMenuButtonClick', 'newFile')
      currentFilePath = null 
      globalThis.appWindow.setTitle(getAppTittle())
    }
    else win.webContents.send('onMenuButtonClick', 'newFile')
  }

  // load page
  win.loadFile(path.join(__dirname, 'desktop.html'))

  // top menu
  const template: any = getTemplate(win, localeCfg, handleNewFile, handleOpenFile)
  const menu = Menu.buildFromTemplate(template)
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
  // localization setup
  globalThis.localizationCfg = getLocalization(app.getLocale())

  // mac stuff
  if (isMac) app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
  else createWindow()

  // open with if there is a file path in args
  globalThis.appWindow.webContents.once('dom-ready', () => {
    currentFilePath = getPathFromArgs(process.argv)
    if (currentFilePath){
      const opened = FileManager.getFileAsBase64Imgs(currentFilePath)
      globalThis.appWindow.webContents.send('onMenuButtonClick', 'openFile', opened )
      globalThis.appWindow.setTitle(getAppTittle(currentFilePath))
    }
  });
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
  if (isMac) {
    app.quit()
  }
})