import type { SubscriptionInfo, SubscriptionTier } from '@/types/subscription'

export type SubscriptionStatus = {
  tier: SubscriptionTier
  status: string
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
}

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
} as const

export const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
}

export const PRICE_PERIODS = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
} as const

export type PricePeriod = (typeof PRICE_PERIODS)[keyof typeof PRICE_PERIODS]
export type SubscriptionPriceId = {
  tier: Exclude<SubscriptionTier, 'free'>
  monthly: string
  annual: string
}

export const PRICE_IDS: SubscriptionPriceId[] = [
  {
    tier: 'starter',
    monthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID || '',
    annual: process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID || '',
  },
  {
    tier: 'pro',
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    annual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '',
  },
]

const FEATURE_TIERS: Record<string, SubscriptionTier> = {
  'minimap-blocker': 'free',
  'pick-blocker': 'starter',
  'obs-integration': 'pro',
  'mmr-tracking': 'starter',
  predictions: 'starter',
  'stream-delay': 'pro',
  // Add more features and their required tiers
}

// Utility functions
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
  subscription: SubscriptionStatus | null
): boolean {
  return subscription?.status === 'active'
}

export function isTrialEligible(
  subscription: SubscriptionStatus | null
): boolean {
  return (
    !subscription ||
    (subscription.tier === 'free' && subscription.status === 'inactive')
  )
}

export function getPriceId(
  tier: Exclude<SubscriptionTier, 'free'>,
  period: PricePeriod
): string {
  const price = PRICE_IDS.find((p) => p.tier === tier)
  if (!price) throw new Error(`No price found for tier ${tier}`)
  return period === 'monthly' ? price.monthly : price.annual
}

export function getButtonText(
  currentSubscription: SubscriptionStatus | null,
  targetTier: SubscriptionTier,
  defaultLabel: string
): string {
  if (!currentSubscription || currentSubscription.status !== 'active') {
    return defaultLabel
  }

  const currentTier = currentSubscription.tier

  if (currentTier === targetTier) {
    return currentSubscription.cancelAtPeriodEnd ? 'Reactivate' : 'Current plan'
  }

  return TIER_LEVELS[targetTier] > TIER_LEVELS[currentTier]
    ? 'Upgrade'
    : 'Downgrade'
}

export function isButtonDisabled(
  subscription: SubscriptionStatus | null,
  targetTier: SubscriptionTier
): boolean {
  return (
    subscription?.status === 'active' &&
    subscription.tier === targetTier &&
    !subscription.cancelAtPeriodEnd
  )
}

// Validation
if (PRICE_IDS.some((price) => !price.monthly || !price.annual)) {
  throw new Error('Missing required Stripe price IDs in environment variables')
}
