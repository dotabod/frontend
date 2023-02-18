import { useState } from 'react'

export const isDev = false //process.env.NODE_ENV === 'development'
export const devTotalTimer = 480000
export const useRoshan = () => {
  const [roshan, setRoshan] = useState({
    minS: isDev ? devTotalTimer / 1000 : 0,
    maxS: isDev ? devTotalTimer / 1000 : 0,
    count: isDev ? 1 : 0,
  })

  return { roshan, setRoshan }
}

export const useAegis = () => {
  const [aegis, setAegis] = useState({
    expireS: isDev ? 300 : 0,
    playerId: isDev ? 5 : null,
  })

  return { aegis, setAegis }
}
