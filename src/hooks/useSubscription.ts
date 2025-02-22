import { canAccessFeature, type FeatureTier } from '@/utils/subscription'
import { useContext } from 'react'
import { SubscriptionContext } from '@/hooks/SubscriptionProvider'

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context)
    throw new Error('useSubscription must be used within SubscriptionProvider')
  return context
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
