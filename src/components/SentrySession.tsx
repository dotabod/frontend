import * as Sentry from '@sentry/nextjs'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

const SentrySession = () => {
  const { data, status } = useSession()

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && status === 'authenticated') {
      Sentry.setUser({
        id: data?.user?.id,
        username: data?.user?.name,
        email: data?.user?.email ?? undefined,
        twitchId: data?.user?.twitchId,
        locale: data?.user?.locale,
        isImpersonating: data?.user?.isImpersonating,
      })
    }
  }, [
    status,
    data?.user?.id,
    data?.user?.name,
    data?.user?.email,
    data?.user?.twitchId,
    data?.user?.locale,
    data?.user?.isImpersonating
  ])

  return null
}

export default SentrySession
