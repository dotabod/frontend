import {
  canAccessFeature,
  SubscriptionStatus,
  FeatureTier,
} from '@/utils/subscription'
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

export function useFeatureAccess(feature?: FeatureTier) {
  const { subscription, isLoading } = useSubscription()

  if (!feature) {
    return {
      hasAccess: true,
      requiredTier: null,
    }
  }

  return {
    ...canAccessFeature(feature, subscription),
    isLoading,
  }
}
