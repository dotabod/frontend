import * as Sentry from '@sentry/nextjs'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

const SentrySession = () => {
  const { data, status } = useSession()

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && status === 'authenticated') {
      Sentry.setUser({
        id: data?.user?.id,
        username: data?.user?.name,
        email: data?.user?.email,
        twitchId: data?.user?.twitchId,
        locale: data?.user?.locale,
      })
    }
  }, [status])

  return null
}

export default SentrySession
