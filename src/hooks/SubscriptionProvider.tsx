import { useRouter } from 'next/router'
import { createContext, useMemo } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'
import { isSubscriptionActive, type SubscriptionRow } from '@/utils/subscription'

interface SubscriptionContextType {
  subscription: SubscriptionRow | null
  isLoading: boolean
  isSubscribed: boolean
}

interface SettingsSubscriptionResponse {
  subscription?: SubscriptionRow | null
}

export const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

export function SubscriptionProviderMain({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const queryUserId = router.query.userId
  const userId = Array.isArray(queryUserId) ? queryUserId[0] : queryUserId

  const routeNeedsSubscription =
    router.pathname.startsWith('/dashboard') || router.pathname.startsWith('/overlay')

  const shouldFetch = router.isReady && (Boolean(userId) || routeNeedsSubscription)
  const subscriptionPath = shouldFetch
    ? userId
      ? `/api/settings?id=${userId}`
      : '/api/settings'
    : null
  const { data, isLoading } = useSWR<SettingsSubscriptionResponse>(
    subscriptionPath,
    fetcher,
    SETTINGS_SWR_OPTIONS,
  )

  // Transform data to add proper Date objects for currentPeriodEnd
  const subscription = useMemo<SubscriptionRow | null>(() => {
    if (!data?.subscription) return null

    const rawSubscription = data.subscription
    return {
      ...rawSubscription,
      currentPeriodEnd: rawSubscription.currentPeriodEnd
        ? new Date(rawSubscription.currentPeriodEnd)
        : null,
    }
  }, [data])

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        isSubscribed: isSubscriptionActive({ status: subscription?.status }),
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}
