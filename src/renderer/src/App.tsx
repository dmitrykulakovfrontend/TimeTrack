// import Versions from './components/Versions'
// import icons from './assets/icons.svg'
// import { Result as CurrentProcess } from 'active-win'
import { useEffect, useState } from 'react'
import { Duration } from 'luxon'
import pluralize from 'pluralize'

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
    timer = setInterval(async () => {
      const process = await window.api.getCurrentProcess()
      console.log('process: ', process)
      if (!process) {
        console.error('no process: ', process)
        return
      }
      const { title, owner } = process
      const formattedTitle = formatProcessName(title, owner.name)

      setDB((prev) => {
        if (!prev) return
        const existingProcess = prev[owner.name]
        const existingSubprocess = existingProcess?.subprocesses[formattedTitle]
        return {
          ...prev,
          [owner.name]: {
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
        }
      })
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [DB])
  useEffect(() => {
    async function testDB(): Promise<void> {
      await window.api.setData(DB)
    }
    if (!DB) return
    testDB()
  }, [DB])
  return (
    <div className="flex items-center justify-center min-h-screen">
      <ul>
        {Object.values(DB || {})
          // .filter((p) => p.seconds > 10)
          .sort((a, b) => b.seconds - a.seconds)
          .map(({ owner, seconds, subprocesses }) => (
            <li className="ml-2" key={owner}>
              <div>
                {displayName(owner)} - {formatTime(seconds)}
              </div>

              {
                <ul>
                  {Object.values(subprocesses)
                    // .filter((p) => p.seconds > 10)
                    .sort((a, b) => b.seconds - a.seconds)
                    .map(({ title, seconds }) => (
                      <li className="ml-4" key={title}>
                        {displayName(title)} - {formatTime(seconds)}
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

function formatProcessName(name: string, owner: string): string {
  switch (owner) {
    case 'Microsoft Edge':
      return /(^.+)and \d+/.exec(name)?.[1] || name
    case 'Visual Studio Code':
      return name.replace(/●/g, '').trim()

    default:
      return name
  }
}

function displayName(name: string): string {
  if (name.length > 120) {
    return name.slice(0, 120) + '...'
  } else return name
}
function formatTime(duration: number): string {
  const luxonDuration = Duration.fromObject({ seconds: duration })

  const hours = luxonDuration.as('hours') >= 1 ? Math.floor(luxonDuration.as('hours')) : 0
  const minutes =
    luxonDuration.as('minutes') >= 1 ? Math.floor(luxonDuration.as('minutes')) % 60 : 0
  const seconds = luxonDuration.as('seconds') % 60

  let formattedTime = ''

  if (hours > 0) {
    formattedTime += `${hours} ${pluralize('hour', hours)}, `
  }

  if (minutes > 0 || hours > 0) {
    formattedTime += `${minutes} ${pluralize('minute', minutes)}, `
  }

  formattedTime += `${seconds} ${pluralize('second', seconds)}`

  return formattedTime
}

export default App
