/// <reference types="@types/firefox-webext-browser"/>
import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import getCurrentProcess from 'active-win'
import type { Process, TimeData } from '../types/data'
import WebSocket, { WebSocketServer } from 'ws'
import { hostname } from 'os'

// Http server
const wss = new WebSocketServer({ port: 9000 })

wss.on('connection', (client) => {
  console.log('Extension connected to app.')
  client.send('Connection successfull')
  client.on('close', () => {
    console.log('Extension disconnected')
  })
  client.on('message', (data) => {
    const tabData = JSON.parse(data.toString())
    currentBrowserTab = tabData
  })
})

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
let data: TimeData | undefined
let currentBrowserTab: browser.tabs.Tab | undefined
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
      const todayDate = new Date().toDateString()
      const todayData = data.find((day) => day.date === todayDate)
      if (!todayData) {
        data.push({
          date: todayDate,
          processes: [createProcess(process) as Process]
        })
        await setData(data)
        return
      }
      const existingProcess = todayData.processes.find(
        (todayProcess) => todayProcess.owner === process.owner.name
      )
      if (!existingProcess) {
        todayData.processes.push(createProcess(process) as Process)
        await setData(data)
        return
      }
      const existingSubprocess = existingProcess.subprocesses.find((subprocess) => {
        if (process.owner.name === 'Firefox' && currentBrowserTab) {
          return subprocess.title === currentBrowserTab.title
        } else {
          return subprocess.title === process.title
        }
      })
      if (!existingSubprocess) {
        existingProcess.subprocesses.push(
          createProcess(process, 'subprocess') as Process['subprocesses'][number]
        )
        await setData(data)
        return
      }
      existingProcess.seconds++
      existingSubprocess.seconds++
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
  data = JSON.parse(await getData()) as TimeData

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function createProcess(
  process: getCurrentProcess.Result,
  type: 'process' | 'subprocess' = 'process'
): Process | Process['subprocesses'][number] {
  if (process.owner.name === 'Firefox' && currentBrowserTab) {
    const tab = currentBrowserTab
    return type === 'subprocess'
      ? {
          title: tab.title || '',
          icon: tab.favIconUrl,
          url: tab.url,
          hostname: new URL(tab.url || '').hostname,
          seconds: 1
        }
      : {
          owner: process.owner.name,
          seconds: 1,
          subprocesses: [
            {
              title: tab.title || '',
              icon: tab.favIconUrl,
              url: tab.url,
              hostname: new URL(tab.url || '').hostname,
              seconds: 1
            }
          ]
        }
  } else if (process.owner.name === 'Firefox') {
  }
  return type === 'subprocess'
    ? {
        title: process.title,
        seconds: 1
      }
    : {
        owner: process.owner.name + (process.owner.name === 'Firefox' ? ' [No extension]' : ''),
        seconds: 1,
        subprocesses: [
          {
            title: process.title,
            seconds: 1
          }
        ]
      }
}

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
const pathToDirectoryData = join(app.getAppPath(), is.dev ? 'data' : '../../data')
async function getData(): Promise<string> {
  try {
    return await readFile(pathToData, { encoding: 'utf-8' })
  } catch (error) {
    console.log({ pathToDirectoryData, pathToData })
    console.error(error)
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.log({ pathToDirectoryData, pathToData, appPath: app.getAppPath() })
      await mkdir(pathToDirectoryData, { recursive: true })
      await writeFile(pathToData, '[]')
    }
    return '[]'
  }
}
async function setData(data: TimeData): Promise<boolean> {
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
