import type { Subscription } from '@prisma/client'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { createContext, useMemo } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { isSubscriptionActive, type SubscriptionRow } from '@/utils/subscription'

interface SubscriptionContextType {
  subscription: SubscriptionRow | null
  isLoading: boolean
  isSubscribed: boolean
}

export const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

export function SubscriptionProviderMain({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()
  const { userId } = router.query

  const shouldFetch = router.isReady && (session.data?.user?.id || userId)
  const { data, isLoading } = useSWR<Subscription>(
    shouldFetch ? `/api/stripe/subscription?id=${userId ?? ''}` : null,
    fetcher,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  // Transform data to add proper Date objects for currentPeriodEnd
  const subscription = useMemo<SubscriptionRow | null>(() => {
    if (!data) return null
    return {
      ...data,
      currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
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
