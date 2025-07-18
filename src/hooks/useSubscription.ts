import { useContext } from 'react'
import { SubscriptionContext } from '@/hooks/SubscriptionProvider'
import { canAccessFeature, type FeatureTier, type GenericFeature } from '@/utils/subscription'

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider')
  return context
}

export function useFeatureAccess(feature?: FeatureTier | GenericFeature) {
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
