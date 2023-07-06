import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Result as CurrentProcess } from 'active-win'

// Custom APIs for renderer
const api = {
  getCurrentProcess: (): Promise<CurrentProcess | undefined> => {
    return ipcRenderer.invoke('getCurrentProcess')
  },
  getData: async (): Promise<string> => {
    const data = await ipcRenderer.invoke('getData')
    return data
  },
  setData: async (data): Promise<boolean> => {
    return await ipcRenderer.invoke('setData', data)
  },
  startTracking: (): void => {
    ipcRenderer.invoke('startTracking')
  },
  stopTracking: (): void => {
    ipcRenderer.invoke('stopTracking')
  }
}

export type Api = typeof api

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
