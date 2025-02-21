export function calculateSavings(
  monthlyPrice: string,
  annualPrice: string
): number {
  const monthly = Number.parseFloat(monthlyPrice.replace('$', '')) * 12
  const annual = Number.parseFloat(annualPrice.replace('$', ''))
  return Math.round(((monthly - annual) / monthly) * 100)
}

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
} as const

export type SubscriptionTier =
  (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS]
export type SubscriptionTierStatus =
  | 'active'
  | 'inactive'
  | 'past_due'
  | 'canceled'

export interface SubscriptionPriceId {
  tier: SubscriptionTier
  monthly: string
  annual: string
}

export type SubscriptionStatus = {
  tier: SubscriptionTier
  status: SubscriptionTierStatus
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
  stripePriceId: string
}

export const TIER_LEVELS: Record<SubscriptionTier, number> = {
  [SUBSCRIPTION_TIERS.FREE]: 0,
  [SUBSCRIPTION_TIERS.STARTER]: 1,
  [SUBSCRIPTION_TIERS.PRO]: 2,
}

export const PRICE_PERIODS = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
} as const

export type PricePeriod = (typeof PRICE_PERIODS)[keyof typeof PRICE_PERIODS]
export const PRICE_IDS: SubscriptionPriceId[] = [
  {
    tier: SUBSCRIPTION_TIERS.STARTER,
    monthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID || '',
    annual: process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID || '',
  },
  {
    tier: SUBSCRIPTION_TIERS.PRO,
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    annual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '',
  },
]
export const FEATURE_TIERS = {
  'minimap-blocker': SUBSCRIPTION_TIERS.FREE,
  'pick-blocker': SUBSCRIPTION_TIERS.STARTER,
  'obs-integration': SUBSCRIPTION_TIERS.PRO,
  'mmr-tracking': SUBSCRIPTION_TIERS.STARTER,
  predictions: SUBSCRIPTION_TIERS.STARTER,
  'stream-delay': SUBSCRIPTION_TIERS.PRO,
} as const

export type FeatureTier = keyof typeof FEATURE_TIERS

// Utility functions
export function canAccessFeature(
  feature: FeatureTier,
  subscription: SubscriptionStatus | null
): { hasAccess: boolean; requiredTier: SubscriptionTier } {
  const requiredTier = FEATURE_TIERS[feature] || SUBSCRIPTION_TIERS.PRO

  if (!subscription || subscription.status !== 'active') {
    return {
      hasAccess: FEATURE_TIERS[feature] === SUBSCRIPTION_TIERS.FREE,
      requiredTier,
    }
  }

  return {
    hasAccess: TIER_LEVELS[subscription.tier] >= TIER_LEVELS[requiredTier],
    requiredTier,
  }
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
    (subscription.tier === SUBSCRIPTION_TIERS.FREE &&
      subscription.status === 'inactive')
  )
}

export function getPriceId(
  tier: Exclude<SubscriptionTier, typeof SUBSCRIPTION_TIERS.FREE>,
  period: PricePeriod
): string {
  const price = PRICE_IDS.find((p) => p.tier === tier)
  if (!price) throw new Error(`No price found for tier ${tier}`)
  return period === 'monthly' ? price.monthly : price.annual
}

export function getCurrentPeriod(priceId?: string): PricePeriod {
  return PRICE_IDS.some((price) => price.monthly === priceId)
    ? 'monthly'
    : 'annual'
}

export function getButtonText(
  currentSubscription: SubscriptionStatus | null,
  targetTier: SubscriptionTier,
  targetPeriod: PricePeriod,
  defaultLabel: string
): string {
  if (!currentSubscription || currentSubscription.status !== 'active') {
    return defaultLabel
  }

  const currentTier = currentSubscription.tier
  const currentPeriod = getCurrentPeriod(currentSubscription.stripePriceId)

  // If same tier but different period
  if (currentTier === targetTier && currentPeriod !== targetPeriod) {
    return `Switch to ${targetPeriod}`
  }

  // If same tier and period
  if (currentTier === targetTier && currentPeriod === targetPeriod) {
    return currentSubscription.cancelAtPeriodEnd ? 'Reactivate' : 'Current plan'
  }

  // If different tier
  return TIER_LEVELS[targetTier] > TIER_LEVELS[currentTier]
    ? 'Upgrade'
    : 'Downgrade'
}

export function isButtonDisabled(
  subscription: SubscriptionStatus | null,
  targetTier: SubscriptionTier,
  targetPeriod: PricePeriod
): boolean {
  // Free tier button should never be disabled
  if (targetTier === SUBSCRIPTION_TIERS.FREE) return false

  if (!subscription || subscription.status !== 'active') return false

  const targetPriceId = getPriceId(
    targetTier as Exclude<SubscriptionTier, typeof SUBSCRIPTION_TIERS.FREE>,
    targetPeriod
  )
  return (
    subscription.stripePriceId === targetPriceId &&
    !subscription.cancelAtPeriodEnd
  )
}

// Validation
if (PRICE_IDS.some((price) => !price.monthly || !price.annual)) {
  throw new Error('Missing required Stripe price IDs in environment variables')
}
