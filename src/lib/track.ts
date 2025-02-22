import { sendGTMEvent } from '@next/third-parties/google'
import { track as vercelTrack } from '@vercel/analytics/react'
import { useSession } from 'next-auth/react'
import { useCallback } from 'react'

export const useTrack = () => {
  const session = useSession()
  const track = useCallback(
    (event: string, properties?: Parameters<typeof vercelTrack>[1]) => {
      const user = session?.data?.user
      vercelTrack(event, { ...properties, user: user?.twitchId ?? '' })
      sendGTMEvent({
        event,
        user: user?.twitchId ?? '',
        ...properties,
      })
    },
    [session],
  )
  return track
}
