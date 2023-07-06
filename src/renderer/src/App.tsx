// import Versions from './components/Versions'
// import icons from './assets/icons.svg'
// import { Result as CurrentProcess } from 'active-win'
import { useEffect, useState } from 'react'
import { Duration } from 'luxon'
import pluralize from 'pluralize'
import Slider from '@mui/material/Slider'
export type Process = {
  seconds: number
  owner: string
  subprocesses: {
    [title: string]: {
      seconds: number
      title: string
    }
  }
}

export type DB = {
  date: string
  processes: {
    [processOwnerName: string]: Process
  }
}[]

function App(): JSX.Element {
  const [DB, setDB] = useState<{
    [processOwnerName: string]: Process
  }>()
  let timer
  useEffect(() => {
    window.api.startTracking()
    async function getDb(): Promise<void> {
      const data = JSON.parse(await window.api.getData())
      const today = data.find((i) => i.date === new Date().toDateString()).processes
      setDB(today)
    }
    getDb()
    timer = setInterval(getDb, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [])
  console.log(DB)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Slider defaultValue={50} max={100} min={0} />
      <Slider defaultValue={30} className="text-teal-600" />
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
