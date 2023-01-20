import { useState } from 'react'

export const isDev = process.env.NODE_ENV === 'development'
export const devTotalTimer = 500000
export const time = new Date().getTime()

export const devMin = isDev ? new Date(time + devTotalTimer).toISOString() : ''
export const devMax = isDev
  ? new Date(
      new Date(time + devTotalTimer).getTime() + devTotalTimer
    ).toISOString()
  : ''

export const useRoshan = () => {
  const [roshan, setRoshan] = useState({
    minS: isDev ? devTotalTimer / 1000 : 0,
    maxS: isDev ? devTotalTimer / 1000 : 0,
    minDate: devMin,
    maxDate: devMax,
    count: isDev ? 1 : 0,
  })

  return { roshan, setRoshan }
}
export const useAegis = () => {
  const [aegis, setAegis] = useState({
    expireS: isDev ? 6 : 0,
    expireTime: '',
    expireDate: isDev ? devMin : '',
    playerId: isDev ? 5 : null,
  })

  return { aegis, setAegis }
}
