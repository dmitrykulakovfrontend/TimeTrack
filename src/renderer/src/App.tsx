// import Versions from './components/Versions'
// import icons from './assets/icons.svg'
// import { Result as CurrentProcess } from 'active-win'
import { useEffect, useState } from 'react'
import { Duration } from 'luxon'
import pluralize from 'pluralize'
import { TimeData, Process } from '../../types/data'
import {
  Card,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Tooltip
} from '@mui/material'
import {
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts'
export enum TimeRange {
  Today = 'Today',
  Yesterday = 'Yesterday',
  Last7Days = 'Last 7 days',
  Last30Days = 'Last 30 days'
}
function App(): JSX.Element {
  const [data, setData] = useState<TimeData>()
  const [date, setDate] = useState<TimeRange>(TimeRange.Today)
  const [isUpdating, setIsUpdating] = useState<boolean>(false)
  const handleChange = (event: SelectChangeEvent): void => {
    setDate(event.target.value as TimeRange)
  }
  let timer: NodeJS.Timeout
  async function updateData(): Promise<void> {
    // window.api.test().then((res) => console.log(res))
    const data = JSON.parse(await window.api.getData())
    setData(data)
  }
  useEffect(() => {
    window.api.startTracking()
    timer = setInterval(updateData, 1000)
    updateData()
    return () => {
      clearInterval(timer)
    }
  }, [])
  useEffect(() => {
    async function visualChange(): Promise<void> {
      setIsUpdating(true)
      await updateData()
      setIsUpdating(false)
    }
    visualChange()
  }, [date])
  if (!data || data.length === 0 || isUpdating) return <span>Loading...</span>
  console.log(data)

  const selectedData = getSelectedData(data, date)
  const selectedTimeTotal = selectedData.reduce((acc, cur) => {
    const sum = cur.processes.reduce((acc, cur) => acc + cur.seconds, 0)
    return acc + sum
  }, 0)

  const chartDataArray = mergeObjectsIntoProcessesArray(selectedData).sort(
    (a, b) => b.seconds - a.seconds
  )
  // console.log({
  //   chartDataArray,
  //   selectedData,
  //   amount: Object.values(chartDataArray[2].subprocesses).length
  // })
  const chartData =
    chartDataArray.length < 20
      ? [...chartDataArray, ...Array(20 - chartDataArray.length).fill({ owner: '', seconds: 0 })]
      : chartDataArray
  const averagePerDay = +(selectedTimeTotal / selectedData.length).toFixed(0)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="grid self-start grid-cols-2 max-md:grid-cols-1 w-fit gap-7">
        {/* <MuiCard
          title="Productive time"
          tooltip="This indicator shows what percentage of time was spent on productive and neutral activities. The more the better."
          value="22%"
        />
        <MuiCard
          title="Distracted time"
          tooltip="Time of unproductive activities"
          value={formatTime(13273699, true) + '  (78%)'}
        /> */}
        <MuiCard
          title="Total time"
          tooltip="This indicator shows total time gathered by TimeTrack for selected time period."
          value={formatTime(selectedTimeTotal, true)}
        />
        <MuiCard
          title="Per day"
          tooltip="This indicator shows average daily time spent in front of the computer for selected time period."
          value={formatTime(averagePerDay, true)}
        />
      </div>
      <div className="w-full p-6 my-6 mr-auto bg-[#f8f8f8] rounded-lg">
        <FormControl className="w-full max-w-xs">
          <InputLabel className="text-xs font-bold font-poppins" id="dateLabel">
            Date
          </InputLabel>
          <Select
            labelId="dateLabel"
            id="dateSelect"
            className="bg-white "
            slotProps={{
              input: {
                className: 'p-2'
              },
              root: {
                className: 'w-[150px]'
              }
            }}
            value={date}
            label="Date"
            onChange={handleChange}
          >
            <MenuItem value={TimeRange.Today}>Today</MenuItem>
            <MenuItem value={TimeRange.Yesterday}>Yesterday</MenuItem>
            <MenuItem value={TimeRange.Last7Days}>Last 7 days</MenuItem>
            <MenuItem value={TimeRange.Last30Days}>Last 30 days</MenuItem>
          </Select>
        </FormControl>
      </div>
      <div className="w-full p-6 border border-gray-300 border-solid rounded-lg shadow">
        <h3 className="text-sm font-poppins">
          Total time: <span className="text-green-500">{formatTime(selectedTimeTotal, true)}</span>
        </h3>
        <ResponsiveContainer width="100%" height={310}>
          <BarChart height={200} data={chartData.slice(0, 20)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              tickLine={false}
              axisLine={false}
              interval={0}
              tickCount={20}
              height={110}
              dataKey="owner"
              tick={<CustomTick />}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={10}
              fontFamily="Verdana"
              tickFormatter={(value): string => formatTime(value, true)}
            />
            <RechartsTooltip
              formatter={(duration): string[] => {
                const value = formatTime(+duration, true)
                return [
                  +duration > 10 ? value : duration === 0 ? '' : duration + 's',
                  duration === 0 ? 'Nothing there yet' : 'time'
                ]
              }}
            />
            <Bar dataKey="seconds" barSize={50} minPointSize={3} fill="#4bb063" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul>
        {chartDataArray.map(({ owner, seconds, subprocesses }) => {
          const browserFormattedSubprocesses = subprocesses.reduce<
            {
              seconds: number
              title: string
              icon?: string | undefined
              url?: string | undefined
              hostname?: string | undefined
              tabs?: {
                seconds: number
                title: string
                icon?: string | undefined
                url?: string | undefined
                hostname?: string | undefined
              }[]
            }[]
          >((acc, curr) => {
            if (curr.hostname) {
              const sameHost = acc.find((obj) => obj.hostname === curr.hostname)
              if (!sameHost) {
                acc.push({
                  seconds: curr.seconds,
                  title: curr.hostname,
                  icon: curr.icon,
                  hostname: curr.hostname,
                  tabs: [curr]
                })
              } else if (sameHost.tabs) {
                if (!sameHost.icon && curr.icon) {
                  sameHost.icon = curr.icon
                }
                sameHost.seconds += curr.seconds
                sameHost.tabs.push(curr)
              }
            } else {
              acc.push(curr)
            }
            return acc
          }, [])
          return (
            <li className="ml-2" key={owner}>
              <div>
                {displayName(owner)} - {formatTime(seconds)}
              </div>
              {
                <ul className="mb-4">
                  {browserFormattedSubprocesses
                    // .filter((p) => p.seconds > 10)
                    .sort((a, b) => b.seconds - a.seconds)
                    .slice(0, 10)
                    .map(({ title, seconds, icon, tabs }) => (
                      <li className="list-none " key={title}>
                        <div className="flex items-center gap-2">
                          {icon ? (
                            <img width={16} height={16} className="mb-2" src={icon}></img>
                          ) : owner === 'Firefox' ? (
                            <div className="flex items-center justify-center w-4 h-4 mb-2 font-bold bg-slate-200">
                              ?
                            </div>
                          ) : (
                            ''
                          )}
                          <span className="mb-2">
                            {displayName(title)} - {formatTime(seconds)}
                          </span>
                        </div>

                        {tabs && (
                          <ul>
                            {tabs
                              .sort((a, b) => b.seconds - a.seconds)
                              .slice(0, 10)
                              .map(({ title, seconds }) => (
                                <li className="flex items-center ml-4 list-none" key={title}>
                                  <div className="h-[2px] w-4 bg-black relative">
                                    <div className="h-6 w-[2px] bg-black absolute bottom-0"></div>
                                  </div>
                                  {displayName(title)} - {formatTime(seconds)}
                                </li>
                              ))}
                            {tabs.length - 10 > 0 ? (
                              <li className="flex items-center ml-4 list-none">
                                <div className="h-[2px] w-4 bg-black relative">
                                  <div className="h-7 w-[2px] bg-black absolute bottom-0"></div>
                                </div>
                                <span className="text-lg underline underline-offset-2 bold">
                                  ...{tabs.length - 10} more which sums up to{' '}
                                  {formatTime(
                                    tabs.slice(10).reduce((acc, curr) => {
                                      return acc + curr.seconds
                                    }, 0)
                                  )}
                                </span>
                              </li>
                            ) : (
                              ''
                            )}
                          </ul>
                        )}
                      </li>
                    ))}
                  {browserFormattedSubprocesses.length - 10 > 0 ? (
                    <li className="ml-4 list-none">
                      <span className="text-xl underline underline-offset-2 bold">
                        ...{browserFormattedSubprocesses.length - 10} more which sums up to{' '}
                        {formatTime(
                          browserFormattedSubprocesses.slice(10).reduce((acc, curr) => {
                            return acc + curr.seconds
                          }, 0)
                        )}
                      </span>
                    </li>
                  ) : (
                    ''
                  )}
                </ul>
              }
            </li>
          )
        })}
      </ul>
    </div>
  )
}
function mergeObjectsIntoProcessesArray(objects: TimeData): Process[] {
  const combinedProcesses: Process[] = []

  for (const obj of objects) {
    const { processes } = obj

    for (const { owner, seconds, subprocesses } of processes) {
      const existingProcess = combinedProcesses.find((entry) => entry.owner === owner)

      if (existingProcess) {
        existingProcess.seconds += seconds
        const previousSubprocesses = existingProcess.subprocesses
        const mergedSubprocesses: {
          seconds: number
          title: string
        }[] = []

        for (const obj of previousSubprocesses) {
          const matchingObj = subprocesses.find((subprocess) => subprocess.title === obj.title)
          if (matchingObj) {
            const mergedObj = { ...matchingObj, seconds: matchingObj.seconds + obj.seconds }
            mergedSubprocesses.push(mergedObj)

            const index = subprocesses.indexOf(matchingObj)
            subprocesses.splice(index, 1)
          } else {
            mergedSubprocesses.push(obj)
          }
        }

        // Add remaining objects from the second array
        mergedSubprocesses.push(...subprocesses)
        existingProcess.subprocesses = mergedSubprocesses
      } else {
        combinedProcesses.push({ owner, seconds, subprocesses })
      }
    }
  }
  console.log({ combinedProcesses })
  return combinedProcesses
}
function getSelectedData(data: TimeData, timerange: TimeRange): TimeData {
  const TODAY = new Date()
  const YESTERDAY = new Date(Date.now() - 86400000)
  const LAST_7_DAYS = new Date(Date.now() - 604800000)
  const LAST_30_DAYS = new Date(Date.now() - 2592000000)
  switch (timerange) {
    case TimeRange.Today:
      return data.filter((i) => i.date === new Date(TODAY).toDateString())
    case TimeRange.Yesterday:
      return data.filter((i) => i.date === new Date(YESTERDAY).toDateString())
    case TimeRange.Last7Days:
      return data.filter((i) => new Date(i.date) >= LAST_7_DAYS)
    case TimeRange.Last30Days:
      return data.filter((i) => new Date(i.date) >= LAST_30_DAYS)
    default:
      return data
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTick({ x, y, payload }: any): JSX.Element {
  return (
    <g transform={`translate(${x - 5},${y - 5})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fontSize={10}
        fontFamily="Poppins"
        fill="#666"
        transform="rotate(-50)"
      >
        {payload.value}
      </text>
    </g>
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
