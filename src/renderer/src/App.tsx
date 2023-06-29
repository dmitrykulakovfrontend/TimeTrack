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

  const [fakeDB, setFakeDB] = useState<FakeDBState>({})
  let timer
  useEffect(() => {
    timer = setInterval(async () => {
      const process = await window.api.getCurrentProcess()
      if (!process) {
        console.error('no process owner name: ', process)
        return
      }
      const { title, owner } = process
      setFakeDB((prev) => {
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
  console.log(fakeDB)
  return <div className="flex justify-center items-center min-h-screen">Test</div>
}

export default App
