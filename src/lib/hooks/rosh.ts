import { useState } from 'react'
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
    minS: isDev ? devTotalTimer / 1000 : 0,
    maxS: isDev ? devTotalTimer / 1000 : 0,
    count: isDev ? 1 : 0,
  })

  const safeSetRoshan = (value: RoshanState | ((prev: RoshanState) => RoshanState)) => {
    if (value) {
      setRoshan(value)
    }
  }

  return { roshan, setRoshan: safeSetRoshan }
}

export const useAegis = () => {
  const [aegis, setAegis] = useState<AegisState>({
    expireS: isDev ? 300 : 0,
    playerId: isDev ? 5 : null,
  })

  const safeSetAegis = (value: AegisState | ((prev: AegisState) => AegisState)) => {
    if (value) {
      setAegis(value)
    }
  }

  return { aegis, setAegis: safeSetAegis }
}
