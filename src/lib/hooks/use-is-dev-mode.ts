import { useEffect, useState } from 'react'

import { isDev } from '@/lib/dev-consts'

export const useIsDevMode = () => {
  const [isDevMode, setIsDevMode] = useState(false)

  useEffect(() => {
    setIsDevMode(isDev())
  }, [])

  return isDevMode
}
