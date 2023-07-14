/* eslint-disable prettier/prettier */
export type Process = {
  seconds: number
  owner: string
  subprocesses: {
    seconds: number
    title: string
  }[]
}

export type DB = {
  date: string
  processes: Process[]
}[]
