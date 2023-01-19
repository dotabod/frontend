import { useState } from 'react'

export const isDev = false
export const devTotalTimer = 500000
export const time = new Date().getTime()

export const devMin = false ? new Date(time + devTotalTimer).toISOString() : ''
export const devMax = false
  ? new Date(
      new Date(time + devTotalTimer).getTime() + devTotalTimer
    ).toISOString()
  : ''

export const useRoshan = () => {
  const [roshan, setRoshan] = useState({
    minS: false ? devTotalTimer / 1000 : 0,
    maxS: false ? devTotalTimer / 1000 : 0,
    minDate: devMin,
    maxDate: devMax,
    count: false ? 1 : 0,
  })

  return { roshan, setRoshan }
}
export const useAegis = () => {
  const [aegis, setAegis] = useState({
    expireS: false ? 6 : 0,
    expireTime: '',
    expireDate: false ? devMin : '',
    playerId: false ? 5 : null,
  })

  return { aegis, setAegis }
}
