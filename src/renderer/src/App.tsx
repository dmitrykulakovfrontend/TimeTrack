import Versions from './components/Versions'
import icons from './assets/icons.svg'
import { Result as CurrentProcess } from 'active-win'
import { useEffect, useState } from 'react'

function App(): JSX.Element {
  type Process = {
    seconds: number
    owner: string
    subprocesses: {
      [title: string]: {
        seconds: number
        title: string
      }
    }
  }

  type DB = {
    [processOwnerName: string]: Process
  }

  const [DB, setDB] = useState<DB>()
  let timer
  useEffect(() => {
    async function getDb(): Promise<void> {
      const data = JSON.parse(await window.api.getData())
      setDB(data)
    }
    if (!DB) {
      getDb()
      return
    }
    console.log(1)
    timer = setInterval(async () => {
      const process = await window.api.getCurrentProcess()
      if (!process) {
        console.error('no process owner name: ', process)
        return
      }
      const { title, owner } = process
      setDB((prev) => {
        if (!prev) return
        const existingProcess = prev[owner.name]
        const existingSubprocess = existingProcess?.subprocesses[title]
        return {
          ...prev,
          [owner.name]: {
            owner: owner.name,
            seconds: existingProcess?.seconds + 1 || 1,
            subprocesses: {
              ...existingProcess?.subprocesses,
              [title]: {
                title,
                seconds: existingSubprocess?.seconds + 1 || 1
              }
            }
          }
        }
      })
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [DB])
  useEffect(() => {
    async function testDB(): Promise<void> {
      const response = await window.api.setData(DB)
      console.log({ response })
      const data = JSON.parse(await window.api.getData())
      console.log({ data })
    }
    if (!DB) return
    testDB()
  }, [DB])
  return (
    <div className="flex items-center justify-center min-h-screen">
      <ul>
        {Object.values(DB || {})
          .sort((a, b) => b.seconds - a.seconds)
          .map(({ owner, seconds, subprocesses }) => (
            <li className="ml-2" key={owner}>
              <div>
                {owner} - {seconds} seconds
              </div>

              {
                <ul>
                  {Object.values(subprocesses).map(({ title, seconds }) => (
                    <li className="ml-4" key={title}>
                      {title} - {seconds} seconds
                    </li>
                  ))}
                </ul>
              }
            </li>
          ))}
      </ul>
    </div>
  )
}

export default App
