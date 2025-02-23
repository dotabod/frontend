import { type SubscriptionStatus, isSubscriptionActive } from '@/utils/subscription'
import { createContext, useEffect, useState } from 'react'

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null
  isLoading: boolean
  isSubscribed: boolean
}

export const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function getSubscription() {
      setIsLoading(true)
      const response = await fetch('/api/stripe/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
      setIsLoading(false)
    }
    getSubscription()
  }, [])

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
