import prisma from '@/lib/db'
import type { SettingKeys, defaultSettings } from '@/lib/defaultSettings'

// Add type safety for chatters
export type ChatterKeys = keyof typeof defaultSettings.chatters
export type ChatterSettingKeys = `chatters.${ChatterKeys}`

export function calculateSavings(monthlyPrice: string, annualPrice: string): number {
  const monthly = Number.parseFloat(monthlyPrice.replace('$', '')) * 12
  const annual = Number.parseFloat(annualPrice.replace('$', ''))
  return Math.round(((monthly - annual) / monthly) * 100)
}

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
} as const

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS]
export type SubscriptionTierStatus = 'active' | 'inactive' | 'past_due' | 'canceled'

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
  [SUBSCRIPTION_TIERS.PRO]: 1,
}

export const PRICE_PERIODS = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
} as const

export type PricePeriod = (typeof PRICE_PERIODS)[keyof typeof PRICE_PERIODS]
export const PRICE_IDS: SubscriptionPriceId[] = [
  {
    tier: SUBSCRIPTION_TIERS.PRO,
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    annual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '',
  },
]
export const FEATURE_TIERS: Record<SettingKeys | ChatterSettingKeys, SubscriptionTier> = {
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

  // Pro Tier Features
  'mmr-tracker': SUBSCRIPTION_TIERS.PRO,
  bets: SUBSCRIPTION_TIERS.PRO,
  'picks-blocker': SUBSCRIPTION_TIERS.PRO,
  rosh: SUBSCRIPTION_TIERS.PRO,
  commandDelay: SUBSCRIPTION_TIERS.PRO,
  commandOnline: SUBSCRIPTION_TIERS.PRO,
  commandWL: SUBSCRIPTION_TIERS.PRO,
  commandRanked: SUBSCRIPTION_TIERS.PRO,
  commandRosh: SUBSCRIPTION_TIERS.PRO,
  'chatters.midas': SUBSCRIPTION_TIERS.FREE,
  'chatters.pause': SUBSCRIPTION_TIERS.PRO,
  'chatters.smoke': SUBSCRIPTION_TIERS.PRO,
  'chatters.passiveDeath': SUBSCRIPTION_TIERS.PRO,
  'chatters.roshPickup': SUBSCRIPTION_TIERS.PRO,
  'chatters.roshDeny': SUBSCRIPTION_TIERS.PRO,
  'chatters.roshanKilled': SUBSCRIPTION_TIERS.PRO,
  'chatters.tip': SUBSCRIPTION_TIERS.PRO,
  'chatters.bounties': SUBSCRIPTION_TIERS.PRO,
  'chatters.powerTreads': SUBSCRIPTION_TIERS.PRO,
  'chatters.killstreak': SUBSCRIPTION_TIERS.PRO,
  'chatters.firstBloodDeath': SUBSCRIPTION_TIERS.PRO,
  'chatters.noTp': SUBSCRIPTION_TIERS.PRO,
  'chatters.matchOutcome': SUBSCRIPTION_TIERS.PRO,
  'chatters.commandsReady': SUBSCRIPTION_TIERS.PRO,
  'chatters.neutralItems': SUBSCRIPTION_TIERS.PRO,
  aegis: SUBSCRIPTION_TIERS.PRO,
  betsInfo: SUBSCRIPTION_TIERS.PRO,
  customMmr: SUBSCRIPTION_TIERS.PRO,
  tellChatNewMMR: SUBSCRIPTION_TIERS.PRO,
  tellChatBets: SUBSCRIPTION_TIERS.PRO,
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

// Add new mapping for generic features
export const GENERIC_FEATURE_TIERS = {
  managers: SUBSCRIPTION_TIERS.PRO,
  autoOBS: SUBSCRIPTION_TIERS.PRO,
  autoInstaller: SUBSCRIPTION_TIERS.PRO,
  autoModerator: SUBSCRIPTION_TIERS.PRO,
  auto7TV: SUBSCRIPTION_TIERS.PRO,
  other_future_feature: SUBSCRIPTION_TIERS.PRO,
} as const

export type GenericFeature = keyof typeof GENERIC_FEATURE_TIERS

export function getRequiredTier(feature?: FeatureTier | GenericFeature): SubscriptionTier {
  if (!feature) return SUBSCRIPTION_TIERS.PRO

  return (
    FEATURE_TIERS[feature as FeatureTier] ||
    GENERIC_FEATURE_TIERS[feature as GenericFeature] ||
    SUBSCRIPTION_TIERS.PRO
  )
}

export function canAccessFeature(
  feature: FeatureTier | GenericFeature,
  subscription: SubscriptionStatus | null,
): { hasAccess: boolean; requiredTier: SubscriptionTier } {
  const requiredTier = getRequiredTier(feature)

  if (!subscription || subscription.status !== 'active') {
    return {
      hasAccess: requiredTier === SUBSCRIPTION_TIERS.FREE,
      requiredTier,
    }
  }

  return {
    hasAccess: TIER_LEVELS[subscription.tier] >= TIER_LEVELS[requiredTier],
    requiredTier,
  }
}

export function isSubscriptionActive(subscription: SubscriptionStatus | null): boolean {
  return subscription?.status === 'active'
}

export function isTrialEligible(subscription: SubscriptionStatus | null): boolean {
  return (
    !subscription ||
    (subscription.tier === SUBSCRIPTION_TIERS.FREE && subscription.status === 'inactive')
  )
}

export function getPriceId(
  tier: Exclude<SubscriptionTier, typeof SUBSCRIPTION_TIERS.FREE>,
  period: PricePeriod,
): string {
  const price = PRICE_IDS.find((p) => p.tier === tier)
  if (!price) throw new Error(`No price found for tier ${tier}`)
  return period === 'monthly' ? price.monthly : price.annual
}

export function getCurrentPeriod(priceId?: string): PricePeriod {
  return PRICE_IDS.some((price) => price.monthly === priceId) ? 'monthly' : 'annual'
}

export function getButtonText(
  currentSubscription: SubscriptionStatus | null,
  targetTier: SubscriptionTier,
  targetPeriod: PricePeriod,
  defaultLabel: string,
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
  return TIER_LEVELS[targetTier] > TIER_LEVELS[currentTier] ? 'Upgrade' : 'Downgrade'
}

export function isButtonDisabled(
  subscription: SubscriptionStatus | null,
  targetTier: SubscriptionTier,
  targetPeriod: PricePeriod,
): boolean {
  // Free tier button should never be disabled
  if (targetTier === SUBSCRIPTION_TIERS.FREE) return false

  if (!subscription || subscription.status !== 'active') return false

  const targetPriceId = getPriceId(
    targetTier as Exclude<SubscriptionTier, typeof SUBSCRIPTION_TIERS.FREE>,
    targetPeriod,
  )
  return subscription.stripePriceId === targetPriceId && !subscription.cancelAtPeriodEnd
}

// Validation
if (PRICE_IDS.some((price) => !price.monthly || !price.annual)) {
  throw new Error('Missing required Stripe price IDs in environment variables')
}

export async function getSubscription(userId: string) {
  const subscription = (await prisma.subscription.findUnique({
    where: { userId },
    select: {
      tier: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripePriceId: true,
      stripeCustomerId: true,
    },
  })) as SubscriptionStatus | null

  return subscription
}
