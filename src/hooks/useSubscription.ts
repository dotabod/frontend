import { canAccessFeature, type SubscriptionStatus } from '@/utils/subscription'
import { useEffect, useState } from 'react'

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null
  )
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

  return {
    subscription,
    isLoading,
    isSubscribed: subscription?.status === 'active',
  }
}

export function useFeatureAccess(feature: string) {
  const { subscription, isLoading } = useSubscription()

  return {
    hasAccess: canAccessFeature(feature, subscription),
    isLoading,
  }
}
