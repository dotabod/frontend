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

  const user = session?.user
  const scope = user?.scope
  const isImpersonating = user?.isImpersonating
  const role = user?.role

  // Effect to sign out user if they lack the necessary scope or a refresh is required
  useEffect(() => {
    if (isImpersonating) {
      return
    }
    if (role === 'chatter') {
      return
    }

    const hasIncompleteScope =
      (scope?.length ?? 0) > 10 && !scope?.includes('moderator:read:followers')
    const shouldSignOut = status === 'authenticated' && (hasIncompleteScope || requiresRefresh)

    if (shouldSignOut) {
      void signOut({ callbackUrl: '/login?setup-scopes', redirect: true })
    }
  }, [scope, isImpersonating, role, status, requiresRefresh])
}

export default useMaybeSignout
