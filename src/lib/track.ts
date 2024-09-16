import { sendGTMEvent } from '@next/third-parties/google'
import { track as vercelTrack } from '@vercel/analytics/react'
import { useSession } from 'next-auth/react'

export const track = (
  event: string,
  properties?: Parameters<typeof vercelTrack>[1]
) => {
  const user = useSession()?.data?.user
  vercelTrack(event, { ...properties, user: user?.twitchId })
  sendGTMEvent({
    event,
    user: user?.twitchId,
    ...properties,
  })
}
