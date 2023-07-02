import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import getCurrentProcess from 'active-win'

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width,
    height,
    show: false,
    center: true,
    autoHideMenuBar: is.dev ? false : true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true
  })
  ipcMain.handle('getCurrentProcess', () => {
    return getCurrentProcess()
  })

  ipcMain.handle('getData', async () => {
    try {
      const data = await readFile(join('data', 'timespent.json'), { encoding: 'utf-8' })
      return data
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        await mkdir('data', { recursive: true })
        await writeFile(join('data', 'timespent.json'), '{}')
      }
      return '{}'
    }
  })

  ipcMain.handle('setData', async (_, data) => {
    try {
      await writeFile(join('data', 'timespent.json'), JSON.stringify(data))
      return true
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        await mkdir('data', { recursive: true })
        await writeFile(join('data', 'timespent.json'), '{}')
        return true
      } else {
        console.log(error)
        return false
      }
    }
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
