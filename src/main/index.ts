import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import getCurrentProcess from 'active-win'
import type { DB } from '../types/data'

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width,
    height,
    show: false,
    center: true,
    autoHideMenuBar: false,

    // autoHideMenuBar: is.dev ? false : true,
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
let timer: NodeJS.Timeout | null = null
let previousProcess: getCurrentProcess.Result | undefined = undefined
let data: DB | undefined = undefined
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
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
    return await getData()
  })

  ipcMain.handle('setData', async (_, data) => {
    return await setData(data)
  })
  ipcMain.handle('test', () => {
    return {
      dir: __dirname,
      pathToData,
      pathToDirectoryData
    }
  })
  ipcMain.handle('startTracking', () => {
    if (timer) {
      clearInterval(timer)
    }
    timer = setInterval(async () => {
      if (!data) {
        return
      }
      let process = await getCurrentProcess()
      if (!process) {
        process = previousProcess
      }
      previousProcess = process
      if (!process) return
      const { owner, title } = process
      const formattedTitle = formatProcessName(title, owner.name)
      const todayDate = new Date().toDateString()
      const todayData = data.find((day) => day.date === todayDate)
      if (!todayData) {
        data.push({
          date: todayDate,
          processes: {
            [owner.name]: {
              owner: owner.name,
              seconds: 1,
              subprocesses: {
                [formattedTitle]: {
                  title: formattedTitle,
                  seconds: 1
                }
              }
            }
          }
        })
        await setData(data)
        return
      }
      const existingProcess = todayData.processes?.[owner.name]
      const existingSubprocess = existingProcess?.subprocesses[formattedTitle]
      todayData.processes[owner.name] = {
        owner: owner.name,
        seconds: existingProcess?.seconds + 1 || 1,
        subprocesses: {
          ...existingProcess?.subprocesses,
          [formattedTitle]: {
            title: formattedTitle,
            seconds: existingSubprocess?.seconds + 1 || 1
          }
        }
      }
      await setData(data)
    }, 1000)
  })
  ipcMain.handle('stopTracking', () => {
    timer && clearInterval(timer)
    timer = null
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  data = JSON.parse(await getData())

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
const pathToData = is.dev
  ? join(app.getAppPath(), 'data', 'timespent.json')
  : join(app.getAppPath(), '../../data', 'timespent.json')
const pathToDirectoryData = join(app.getAppPath(), '../../data')
async function getData(): Promise<string> {
  try {
    return await readFile(pathToData, { encoding: 'utf-8' })
  } catch (error) {
    console.log({ pathToDirectoryData, pathToData })
    console.error(error)
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      await mkdir(pathToDirectoryData, { recursive: true })
      await writeFile(pathToData, '[]')
    }
    return '[]'
  }
}
async function setData(data: DB): Promise<boolean> {
  try {
    await writeFile(pathToData, JSON.stringify(data))
    return true
  } catch (error) {
    console.error(error)
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      await mkdir(pathToDirectoryData, { recursive: true })
      await writeFile(pathToData, '[]')
      return true
    } else {
      console.log(error)
      return false
    }
  }
}
export function formatProcessName(name: string, owner: string): string {
  switch (owner) {
    case 'Microsoft Edge':
      return /(^.+)and \d+/.exec(name)?.[1] || name
    case 'Visual Studio Code':
      return name.replace(/●/g, '').trim()

    default:
      return name
  }
}
