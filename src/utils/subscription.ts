import type { SubscriptionInfo, SubscriptionTier } from '@/types/subscription'

const FEATURE_TIERS: Record<string, SubscriptionTier> = {
  'minimap-blocker': 'free',
  'pick-blocker': 'starter',
  'obs-integration': 'pro',
  'mmr-tracking': 'starter',
  predictions: 'starter',
  'stream-delay': 'pro',
  // Add more features and their required tiers
}

const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
}

export function canAccessFeature(
  feature: string,
  subscription: SubscriptionInfo | null
): boolean {
  if (!subscription || subscription.status !== 'active') {
    return FEATURE_TIERS[feature] === 'free'
  }

  const requiredTier = FEATURE_TIERS[feature] || 'pro'
  return TIER_LEVELS[subscription.tier] >= TIER_LEVELS[requiredTier]
}

export function isSubscriptionActive(
  subscription: SubscriptionInfo | null
): boolean {
  return subscription?.status === 'active'
}

export function isTrialEligible(
  subscription: SubscriptionInfo | null
): boolean {
  return (
    !subscription ||
    (subscription.tier === 'free' && subscription.status === 'inactive')
  )
}
