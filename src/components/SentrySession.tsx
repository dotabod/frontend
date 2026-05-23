import * as Sentry from '@sentry/nextjs'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useCookiePreferences } from '@/lib/cookieManager'

const SentrySession = () => {
  const { data, status } = useSession()
  const { preferences, loaded } = useCookiePreferences()

  useEffect(() => {
    // Only set Sentry user data if analytics is enabled and user is authenticated
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && status === 'authenticated' && loaded) {
      if (preferences.analytics) {
        Sentry.setUser({
          email: data?.user?.email ?? undefined,
          id: data?.user?.id,
          isImpersonating: data?.user?.isImpersonating,
          locale: data?.user?.locale,
          twitchId: data?.user?.twitchId,
          username: data?.user?.name,
        })
      } else {
        // Clear user data if analytics is disabled
        Sentry.setUser(null)
      }
    }
  }, [
    status,
    data?.user?.id,
    data?.user?.name,
    data?.user?.email,
    data?.user?.twitchId,
    data?.user?.locale,
    data?.user?.isImpersonating,
    preferences.analytics,
    loaded,
  ])

  return null
}

export default SentrySession
