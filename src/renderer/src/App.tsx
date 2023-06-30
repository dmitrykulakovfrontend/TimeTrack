import Versions from './components/Versions'
import icons from './assets/icons.svg'
import { Result as CurrentProcess } from 'active-win'
import { useEffect, useState } from 'react'

function App(): JSX.Element {
  type Process = {
    seconds: number
    [subprocessTitle: string]:
      | {
          seconds: number
        }
      | number
  }

  type FakeDBState = {
    [processOwnerName: string]: Process
  }

  const [db, setDb] = useState<FakeDBState>()
  let timer
  useEffect(() => {
    async function getDb(): Promise<void> {
      const data = JSON.parse(await window.api.getData())
      setDb(data)
    }
    if (!db) {
      getDb()
      return
    }
    timer = setInterval(async () => {
      const process = await window.api.getCurrentProcess()
      if (!process) {
        console.error('no process owner name: ', process)
        return
      }
      const { title, owner } = process
      setDb((prev) => {
        if (!prev) return
        const existingProcess = prev[owner.name]
        const existingSubprocess = existingProcess?.[title]
        if (typeof existingSubprocess === 'number') {
          console.error('existingSubprocess is number', existingSubprocess)
          return { ...prev }
        }
        return {
          ...prev,
          [owner.name]: {
            ...existingProcess,
            seconds: existingProcess?.seconds + 1 || 1,
            [title]: {
              seconds: existingSubprocess?.seconds + 1 || 1
            }
          }
        }
      })
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [])
  useEffect(() => {
    async function testDB(): Promise<void> {
      const response = await window.api.setData(db)
      console.log({ response })
      const data = JSON.parse(await window.api.getData())
      console.log({ data })
    }
    if (!db) return
    testDB()
  }, [db])
  return (
    <div className="flex items-center justify-center min-h-screen">
      <ul>
        {Object.entries(db || {})
          .sort((a, b) => b[1].seconds - a[1].seconds)
          .map(([ownerName, process]) =>
            ownerName === 'seconds' ? null : (
              <li className="ml-2" key={ownerName}>
                <div>
                  {ownerName} - {process.seconds} seconds
                </div>

                {typeof process === 'number' ? null : (
                  <ul>
                    {Object.entries(process).map(([title, subProcess]) =>
                      title === 'seconds' ? null : (
                        <li className="ml-4" key={title}>
                          {title.slice(0, 40)} - {subProcess?.seconds} seconds
                        </li>
                      )
                    )}
                  </ul>
                )}
              </li>
            )
          )}
      </ul>
    </div>
  )
}

export default App
