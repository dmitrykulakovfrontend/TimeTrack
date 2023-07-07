/* eslint-disable prettier/prettier */
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
