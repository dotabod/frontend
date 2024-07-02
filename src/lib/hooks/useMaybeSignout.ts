import { signOut, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import useSWR from 'swr'
import { fetcher } from '../fetcher'

// Custom hook to conditionally sign out a user based on session and refresh status
const useMaybeSignout = (skip = false) => {
  const { data: session, status } = useSession()
  const shouldFetch = !skip && status === 'authenticated'

  // Fetch data to check if a refresh is required
  const { data: requiresRefresh } = useSWR(
    shouldFetch ? '/api/check-requires-refresh' : null,
    fetcher
  )

  // Effect to sign out user if they lack the necessary scope or a refresh is required
  useEffect(() => {
    const shouldSignOut =
      status === 'authenticated' &&
      (!session?.user?.scope?.includes('channel:bot') || requiresRefresh)

    if (shouldSignOut) {
      signOut({ callbackUrl: '/login?setup-scopes' })
    }
  }, [session?.user?.scope, status, requiresRefresh])
}

export default useMaybeSignout
