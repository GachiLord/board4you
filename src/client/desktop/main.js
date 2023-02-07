const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const isMac = process.platform === 'darwin'
const path = require('path')
const ElectronFileManager = require('../model/ElectronFileManager')


let currentFilePath = null // path to editable file
let fileHasChanged = false


function createWindow() {
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
      message: 'Продолжить редактирование или закрыть файл без сохранения?',
      type: 'question',
      buttons: ['Продолжить', 'Не сохранять'],
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

  // load page
  win.loadFile('./bundles/desktop/index.html')

  // top menu
  const template = [
    // { role: 'fileMenu' }
    {
      label: 'Файл',
      submenu: [
        { label: 'Создать', click: () => { 
          win.webContents.send('onMenuButtonClick', 'newFile')
          currentFilePath = null 
        },
          accelerator: 'CommandOrControl+N' },
        { label: 'Открыть', click: handleOpenFile, accelerator: 'CommandOrControl+O' },
        { type: 'separator'},
        { label: 'Сохранить', click: () => { 
          win.webContents.send('onMenuButtonClick', 'saveFile')
         }, accelerator: 'CommandOrControl+S' },
        { label: 'Сохранить как', click: () => { win.webContents.send('onMenuButtonClick', 'saveFileAs') }, accelerator: 'CommandOrControl+Shift+S' },
        { type: 'separator'},
        isMac ? { role: 'close', label: 'Файл' } : { role: 'quit', label: 'Закрыть' }
      ]
    },
    // { role: 'editMenu' }
    {
      label: 'Правка',
      submenu: [
        { label: 'Отменить', click: () => { win.webContents.send('onMenuButtonClick', 'undo') }, accelerator: 'CommandOrControl+Z' },
        { label: 'Повторить', click: () => { win.webContents.send('onMenuButtonClick', 'redo') }, accelerator: 'CommandOrControl+Y' },
        { type: 'separator'},
        { label: 'Вырезать', click: () => { win.webContents.send('onMenuButtonClick', 'cut') }, accelerator: 'CommandOrControl+X' },
        { label: 'Скопировать', click: () => { win.webContents.send('onMenuButtonClick', 'copy') }, accelerator: 'CommandOrControl+C' },
        { label: 'Вставить', role: 'paste' },
        { label: 'Удалить', click: () => { win.webContents.send('onMenuButtonClick', 'del') }, accelerator: 'Delete' }
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Перезагрузить' },
        { role: 'forceReload', label: 'Принудительно перезагрузить' },
        { role: 'toggleDevTools', label: 'Инструменты разработчика' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Стандартный размер' },
        { role: 'zoomIn', label: 'Приблизить' },
        { role: 'zoomOut', label: 'Отдалить' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Полноэкранный режим' }
      ]
    },
    // { role: 'windowMenu' }
    {
      role: 'help',
      submenu: [
        {
          label: 'Узнать больше',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://electronjs.org')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  win.on('close', (e) => {
    if ( fileHasChanged ) {
      if (exitAlert()) e.preventDefault()
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  ipcMain.on('saveFileAs', async (_, data) => {
    currentFilePath = await ElectronFileManager.saveBase64As(data)
    fileHasChanged = false
  })

  ipcMain.on('saveFile', async (_, data) => {
    if (currentFilePath !== null) ElectronFileManager.saveBase64(data, currentFilePath)
    else currentFilePath = await ElectronFileManager.saveBase64As(data)
    fileHasChanged = false
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