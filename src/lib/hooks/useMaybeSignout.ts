import { signOut, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import useSWR from 'swr'
import { STABLE_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'
import { fetcher } from '../fetcher'

// Custom hook to conditionally sign out a user based on session and refresh status
const useMaybeSignout = (skip = false) => {
  const { data: session, status } = useSession()

  const shouldFetch = !skip && status === 'authenticated'

  // Fetch data to check if a refresh is required
  const { data: requiresRefresh } = useSWR(
    shouldFetch ? '/api/check-requires-refresh' : null,
    fetcher,
    STABLE_SWR_OPTIONS,
  )

  // Effect to sign out user if they lack the necessary scope or a refresh is required
  useEffect(() => {
    if (session?.user?.isImpersonating) return

    if (session?.user?.role === 'chatter') {
      return
    }

    const shouldSignOut =
      status === 'authenticated' &&
      ((session?.user?.scope?.length > 10 &&
        !session?.user?.scope?.includes('moderator:read:followers')) ||
        requiresRefresh)

    if (shouldSignOut) {
      signOut({ callbackUrl: '/login?setup-scopes', redirect: true })
    }
  }, [
    session?.user?.scope,
    session?.user?.isImpersonating,
    status,
    requiresRefresh,
    session?.user?.role,
  ])
}

export default useMaybeSignout
