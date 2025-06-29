import type { Subscription } from '@prisma/client'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { createContext, useEffect, useState } from 'react'
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
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function getSubscription() {
      setIsLoading(true)
      const response = await fetch(`/api/stripe/subscription?id=${userId ?? ''}`)
      if (response.ok) {
        const data: Subscription = await response.json()
        // Create date objects for currentPeriodEnd
        const subscriptionData = {
          ...data,
          currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
        }
        setSubscription(subscriptionData)
      }
      setIsLoading(false)
    }
    router.isReady && (session.data?.user?.id || userId) && getSubscription()
  }, [userId, router.isReady, session.data?.user?.id])

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
