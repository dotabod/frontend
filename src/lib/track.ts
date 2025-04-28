import { sendGTMEvent } from '@next/third-parties/google'
import { useSession } from 'next-auth/react'
import { useCallback } from 'react'
import { useCookiePreferences } from './cookieManager'

export const useTrack = () => {
  const session = useSession()
  const { preferences } = useCookiePreferences()

  const track = useCallback(
    (event: string, properties?: any) => {
      // Only track if analytics is enabled
      if (!preferences.analytics) return

      const user = session?.data?.user
      sendGTMEvent({
        event,
        user: user?.twitchId ?? '',
        ...properties,
      })
    },
    [session, preferences.analytics],
  )
  return track
}
