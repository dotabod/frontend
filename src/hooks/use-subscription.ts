import { useContext } from 'react'

import { SubscriptionContext } from '@/hooks/subscription-provider'
import { canAccessFeature } from '@/utils/subscription'
import type { FeatureTier, GenericFeature } from '@/utils/subscription'

export const useSubscription = function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return context
}

export const useFeatureAccess = function useFeatureAccess(feature?: FeatureTier | GenericFeature) {
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
