import type { SettingKeys } from '@/lib/defaultSettings'
import type { defaultSettings } from '@/lib/defaultSettings'

// Add type safety for chatters
export type ChatterKeys = keyof typeof defaultSettings.chatters
export type ChatterSettingKeys = `chatters.${ChatterKeys}`

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
export const FEATURE_TIERS: Record<
  SettingKeys | ChatterSettingKeys,
  SubscriptionTier
> = {
  // Free Tier Features
  'minimap-blocker': SUBSCRIPTION_TIERS.FREE,
  chatter: SUBSCRIPTION_TIERS.FREE,
  'only-block-ranked': SUBSCRIPTION_TIERS.FREE,
  commandCommands: SUBSCRIPTION_TIERS.FREE,
  commandMmr: SUBSCRIPTION_TIERS.FREE,
  commandDisable: SUBSCRIPTION_TIERS.FREE,
  mmr: SUBSCRIPTION_TIERS.FREE,
  chatters: SUBSCRIPTION_TIERS.FREE,
  commandFixparty: SUBSCRIPTION_TIERS.FREE,
  commandRefresh: SUBSCRIPTION_TIERS.FREE,
  commandSetmmr: SUBSCRIPTION_TIERS.FREE,
  commandBeta: SUBSCRIPTION_TIERS.FREE,
  commandMute: SUBSCRIPTION_TIERS.FREE,
  commandPing: SUBSCRIPTION_TIERS.FREE,
  commandDotabod: SUBSCRIPTION_TIERS.FREE,

  // Starter Tier Features
  'mmr-tracker': SUBSCRIPTION_TIERS.STARTER,
  bets: SUBSCRIPTION_TIERS.STARTER,
  'picks-blocker': SUBSCRIPTION_TIERS.STARTER,
  rosh: SUBSCRIPTION_TIERS.STARTER,
  commandDelay: SUBSCRIPTION_TIERS.STARTER,
  commandOnline: SUBSCRIPTION_TIERS.STARTER,
  commandWL: SUBSCRIPTION_TIERS.STARTER,
  commandRanked: SUBSCRIPTION_TIERS.STARTER,
  commandRosh: SUBSCRIPTION_TIERS.STARTER,
  'chatters.midas': SUBSCRIPTION_TIERS.STARTER,
  'chatters.pause': SUBSCRIPTION_TIERS.STARTER,
  'chatters.smoke': SUBSCRIPTION_TIERS.STARTER,
  'chatters.passiveDeath': SUBSCRIPTION_TIERS.STARTER,
  'chatters.roshPickup': SUBSCRIPTION_TIERS.STARTER,
  'chatters.roshDeny': SUBSCRIPTION_TIERS.STARTER,
  'chatters.roshanKilled': SUBSCRIPTION_TIERS.STARTER,
  'chatters.tip': SUBSCRIPTION_TIERS.STARTER,
  'chatters.bounties': SUBSCRIPTION_TIERS.STARTER,
  'chatters.powerTreads': SUBSCRIPTION_TIERS.STARTER,
  'chatters.killstreak': SUBSCRIPTION_TIERS.STARTER,
  'chatters.firstBloodDeath': SUBSCRIPTION_TIERS.STARTER,
  'chatters.noTp': SUBSCRIPTION_TIERS.STARTER,
  'chatters.matchOutcome': SUBSCRIPTION_TIERS.STARTER,
  'chatters.commandsReady': SUBSCRIPTION_TIERS.STARTER,
  'chatters.neutralItems': SUBSCRIPTION_TIERS.STARTER,
  aegis: SUBSCRIPTION_TIERS.STARTER,
  betsInfo: SUBSCRIPTION_TIERS.STARTER,
  customMmr: SUBSCRIPTION_TIERS.STARTER,
  tellChatNewMMR: SUBSCRIPTION_TIERS.STARTER,
  tellChatBets: SUBSCRIPTION_TIERS.STARTER,

  // Pro Tier Features
  'obs-scene-switcher': SUBSCRIPTION_TIERS.PRO,
  streamDelay: SUBSCRIPTION_TIERS.PRO,
  livePolls: SUBSCRIPTION_TIERS.PRO,
  'minimap-simple': SUBSCRIPTION_TIERS.PRO,
  'minimap-xl': SUBSCRIPTION_TIERS.PRO,
  notablePlayersOverlay: SUBSCRIPTION_TIERS.PRO,
  notablePlayersOverlayFlags: SUBSCRIPTION_TIERS.PRO,
  notablePlayersOverlayFlagsCmd: SUBSCRIPTION_TIERS.PRO,
  winProbabilityOverlay: SUBSCRIPTION_TIERS.PRO,
  queueBlocker: SUBSCRIPTION_TIERS.PRO,
  queueBlockerFindMatch: SUBSCRIPTION_TIERS.PRO,
  commandSpectators: SUBSCRIPTION_TIERS.PRO,
  commandFacet: SUBSCRIPTION_TIERS.PRO,
  commandInnate: SUBSCRIPTION_TIERS.PRO,
  commandShard: SUBSCRIPTION_TIERS.PRO,
  commandAghs: SUBSCRIPTION_TIERS.PRO,
  commandWinProbability: SUBSCRIPTION_TIERS.PRO,
  commandAPM: SUBSCRIPTION_TIERS.PRO,
  commandAvg: SUBSCRIPTION_TIERS.PRO,
  commandDotabuff: SUBSCRIPTION_TIERS.PRO,
  commandGM: SUBSCRIPTION_TIERS.PRO,
  commandGPM: SUBSCRIPTION_TIERS.PRO,
  commandHero: SUBSCRIPTION_TIERS.PRO,
  commandLG: SUBSCRIPTION_TIERS.PRO,
  commandModsonly: SUBSCRIPTION_TIERS.PRO,
  commandNP: SUBSCRIPTION_TIERS.PRO,
  commandOpendota: SUBSCRIPTION_TIERS.PRO,
  commandPleb: SUBSCRIPTION_TIERS.PRO,
  commandSmurfs: SUBSCRIPTION_TIERS.PRO,
  commandProfile: SUBSCRIPTION_TIERS.PRO,
  commandLGS: SUBSCRIPTION_TIERS.PRO,
  commandSteam: SUBSCRIPTION_TIERS.PRO,
  commandXPM: SUBSCRIPTION_TIERS.PRO,
  commandBuilds: SUBSCRIPTION_TIERS.PRO,
  commandItems: SUBSCRIPTION_TIERS.PRO,
  commandVersion: SUBSCRIPTION_TIERS.PRO,
  commandResetwl: SUBSCRIPTION_TIERS.PRO,
  commandLocale: SUBSCRIPTION_TIERS.PRO,
  showRankMmr: SUBSCRIPTION_TIERS.PRO,
  showRankImage: SUBSCRIPTION_TIERS.PRO,
  showRankLeader: SUBSCRIPTION_TIERS.PRO,
  obsServerPassword: SUBSCRIPTION_TIERS.PRO,
  obsServerPort: SUBSCRIPTION_TIERS.PRO,
  battlepass: SUBSCRIPTION_TIERS.PRO,
  minimapRight: SUBSCRIPTION_TIERS.PRO,
  onlyParty: SUBSCRIPTION_TIERS.PRO,
  'obs-dc': SUBSCRIPTION_TIERS.PRO,
  'obs-minimap': SUBSCRIPTION_TIERS.PRO,
  'obs-picks': SUBSCRIPTION_TIERS.PRO,
  queueBlockerFindMatchText: SUBSCRIPTION_TIERS.PRO,
  winProbabilityOverlayIntervalMinutes: SUBSCRIPTION_TIERS.PRO,
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
