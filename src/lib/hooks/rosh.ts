import { useEffect, useState } from 'react'
import { isDev } from '@/lib/devConsts'

const devTotalTimer = 480000

interface RoshanState {
  minS: number
  maxS: number
  count: number
}

interface AegisState {
  expireS: number
  playerId: number | null
}

export const useRoshan = () => {
  const [roshan, setRoshan] = useState<RoshanState>({
    minS: 0,
    maxS: 0,
    count: 0,
  })

  useEffect(() => {
    if (!isDev()) return

    setRoshan({
      minS: devTotalTimer / 1000,
      maxS: devTotalTimer / 1000,
      count: 1,
    })
  }, [])

  const safeSetRoshan = (value: RoshanState | ((prev: RoshanState) => RoshanState)) => {
    if (value) {
      setRoshan(value)
    }
  }

  return { roshan, setRoshan: safeSetRoshan }
}

export const useAegis = () => {
  const [aegis, setAegis] = useState<AegisState>({
    expireS: 0,
    playerId: null,
  })

  useEffect(() => {
    if (!isDev()) return

    setAegis({
      expireS: 300,
      playerId: 5,
    })
  }, [])

  const safeSetAegis = (value: AegisState | ((prev: AegisState) => AegisState)) => {
    if (value) {
      setAegis(value)
    }
  }

  return { aegis, setAegis: safeSetAegis }
}
