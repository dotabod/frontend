import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export const HydratedContent = ({ children }: { children: ReactNode }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div style={{ display: 'contents', visibility: mounted ? undefined : 'hidden' }}>
      {children}
    </div>
  )
}
