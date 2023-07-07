// import Versions from './components/Versions'
// import icons from './assets/icons.svg'
// import { Result as CurrentProcess } from 'active-win'
import { useEffect, useState } from 'react'
import { Duration } from 'luxon'
import pluralize from 'pluralize'
import Slider from '@mui/material/Slider'
import { Process, DB } from '../../types/data'
import { Card, Badge, Tooltip } from '@mui/material'

function App(): JSX.Element {
  const [DB, setDB] = useState<DB>()
  let timer
  useEffect(() => {
    window.api.startTracking()
    async function getDb(): Promise<void> {
      const data = JSON.parse(await window.api.getData())
      setDB(data)
    }
    getDb()
    timer = setInterval(getDb, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [])
  const totalTime =
    DB?.reduce((acc, cur) => {
      const sum = Object.values(cur.processes).reduce((acc, cur) => acc + cur.seconds, 0)
      return acc + sum
    }, 0) || 1
  const averagePerDay = +((totalTime || 1) / (DB?.length || 1)).toFixed(0)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="grid self-start grid-cols-2 p-8 max-md:grid-cols-1 w-fit gap-7">
        <MuiCard
          title="Productive time"
          tooltip="This indicator shows what percentage of time was spent on productive and neutral activities. The more the better."
          value="22%"
        />
        <MuiCard
          title="Distracted time"
          tooltip="Time of unproductive activities"
          value={formatTime(13273699, true) + '  (78%)'}
        />
        <MuiCard
          title="Total time"
          tooltip="This indicator shows total time gathered by TimeTrack for selected time period."
          value={formatTime(totalTime, true)}
        />
        <MuiCard
          title="Per day"
          tooltip="This indicator shows average daily time spent in front of the computer for selected time period."
          value={formatTime(averagePerDay, true)}
        />
      </div>
      <ul>
        {Object.values(DB?.find((i) => i.date === new Date().toDateString())?.processes || {})
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

export type MuiCardProps = {
  title: string
  value: string
  tooltip: string
}

export function MuiCard({ title, value, tooltip }: MuiCardProps): JSX.Element {
  return (
    <Card
      variant="outlined"
      className="flex shadow-md flex-col items-center justify-center  min-w-[320px]  gap-4 p-4 rounded font-poppins bg-gray-500/5"
    >
      <div className="flex items-center gap-2 uppercase">
        <span className="text-xs">{title}</span>
        <Tooltip title={tooltip}>
          <div className="flex items-center justify-center w-3 h-3 text-[10px] font-bold border border-black border-solid rounded-full">
            ?
          </div>
        </Tooltip>
      </div>
      <span className="text-2xl font-bold text-center text-green-500">{value}</span>
    </Card>
  )
}

function displayName(name: string): string {
  if (name.length > 120) {
    return name.slice(0, 120) + '...'
  } else return name
}
function formatTime(duration: number, short?: boolean): string {
  const luxonDuration = Duration.fromObject({ seconds: duration })

  const hours = luxonDuration.as('hours') >= 1 ? Math.floor(luxonDuration.as('hours')) : 0
  const minutes =
    luxonDuration.as('minutes') >= 1 ? Math.floor(luxonDuration.as('minutes')) % 60 : 0
  const seconds = luxonDuration.as('seconds') % 60

  let formattedTime = ''

  if (hours > 0) {
    formattedTime += `${hours}${short ? 'h ' : ' ' + pluralize('hour', hours) + ', '}`
  }

  if (minutes > 0 || hours > 0) {
    formattedTime += `${minutes}${short ? 'm ' : ' ' + pluralize('minute', minutes) + ', '}`
  }
  if (short) return formattedTime

  formattedTime += `${seconds}${short ? 's ' : ' ' + pluralize('second', seconds) + ', '}`

  return formattedTime
}

export default App
