/* eslint-disable prettier/prettier */
export type Process = {
  seconds: number
  owner: string
  subprocesses: {
    seconds: number
    title: string
    // for browsers supported by extension only
    icon?: string | undefined
    url?: string | undefined
    hostname?: string | undefined
  }[]
}

export type TimeData = {
  date: string
  processes: Process[]
}[]
