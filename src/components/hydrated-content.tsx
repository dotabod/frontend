import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

const subscribe = () => () => {
  // Hydration snapshots do not need an external event subscription.
}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export const HydratedContent = ({ children }: { children: ReactNode }) => {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
  return (
    <div style={{ display: 'contents', visibility: mounted ? undefined : 'hidden' }}>
      {children}
    </div>
  )
}
