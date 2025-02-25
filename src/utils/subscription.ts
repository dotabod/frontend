import prisma from '@/lib/db'
import type { SettingKeys, defaultSettings } from '@/lib/defaultSettings'
import {
  type Prisma,
  type Subscription,
  SubscriptionStatus,
  SubscriptionTier,
  TransactionType,
} from '@prisma/client'

// Add type safety for chatters
export type ChatterKeys = keyof typeof defaultSettings.chatters
export type ChatterSettingKeys = `chatters.${ChatterKeys}`

export const SUBSCRIPTION_TIERS = SubscriptionTier

export type SubscriptionRow = Subscription

export const TIER_LEVELS: Record<SubscriptionTier, number> = {
  [SUBSCRIPTION_TIERS.FREE]: 0,
  [SUBSCRIPTION_TIERS.PRO]: 1,
}

export const PRICE_PERIODS = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
  LIFETIME: 'lifetime',
} as const

export type PricePeriod = (typeof PRICE_PERIODS)[keyof typeof PRICE_PERIODS]

export const FEATURE_TIERS: Record<SettingKeys | ChatterSettingKeys, SubscriptionTier> = {
  // Free Tier Features
  'minimap-blocker': SUBSCRIPTION_TIERS.FREE,
  chatter: SUBSCRIPTION_TIERS.FREE,
  'only-block-ranked': SUBSCRIPTION_TIERS.PRO,
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
  commandOnline: SUBSCRIPTION_TIERS.FREE,
  commandWL: SUBSCRIPTION_TIERS.FREE,
  commandRanked: SUBSCRIPTION_TIERS.FREE,
  commandRosh: SUBSCRIPTION_TIERS.PRO,
  'chatters.midas': SUBSCRIPTION_TIERS.PRO,
  'chatters.pause': SUBSCRIPTION_TIERS.FREE,
  'chatters.smoke': SUBSCRIPTION_TIERS.FREE,
  'chatters.passiveDeath': SUBSCRIPTION_TIERS.PRO,
  'chatters.roshPickup': SUBSCRIPTION_TIERS.PRO,
  'chatters.roshDeny': SUBSCRIPTION_TIERS.PRO,
  'chatters.roshanKilled': SUBSCRIPTION_TIERS.PRO,
  'chatters.tip': SUBSCRIPTION_TIERS.FREE,
  'chatters.bounties': SUBSCRIPTION_TIERS.FREE,
  'chatters.powerTreads': SUBSCRIPTION_TIERS.PRO,
  'chatters.killstreak': SUBSCRIPTION_TIERS.FREE,
  'chatters.firstBloodDeath': SUBSCRIPTION_TIERS.PRO,
  'chatters.noTp': SUBSCRIPTION_TIERS.FREE,
  'chatters.matchOutcome': SUBSCRIPTION_TIERS.FREE,
  'chatters.commandsReady': SUBSCRIPTION_TIERS.FREE,
  'chatters.neutralItems': SUBSCRIPTION_TIERS.PRO,
  aegis: SUBSCRIPTION_TIERS.PRO,
  betsInfo: SUBSCRIPTION_TIERS.PRO,
  customMmr: SUBSCRIPTION_TIERS.PRO,
  tellChatNewMMR: SUBSCRIPTION_TIERS.FREE,
  tellChatBets: SUBSCRIPTION_TIERS.PRO,
  'obs-scene-switcher': SUBSCRIPTION_TIERS.PRO,
  streamDelay: SUBSCRIPTION_TIERS.PRO,
  livePolls: SUBSCRIPTION_TIERS.PRO,
  'minimap-simple': SUBSCRIPTION_TIERS.PRO,
  'minimap-xl': SUBSCRIPTION_TIERS.FREE,
  notablePlayersOverlay: SUBSCRIPTION_TIERS.PRO,
  notablePlayersOverlayFlags: SUBSCRIPTION_TIERS.PRO,
  notablePlayersOverlayFlagsCmd: SUBSCRIPTION_TIERS.PRO,
  winProbabilityOverlay: SUBSCRIPTION_TIERS.PRO,
  queueBlocker: SUBSCRIPTION_TIERS.PRO,
  queueBlockerFindMatch: SUBSCRIPTION_TIERS.PRO,
  commandSpectators: SUBSCRIPTION_TIERS.FREE,
  commandFacet: SUBSCRIPTION_TIERS.FREE,
  commandInnate: SUBSCRIPTION_TIERS.FREE,
  commandShard: SUBSCRIPTION_TIERS.FREE,
  commandAghs: SUBSCRIPTION_TIERS.FREE,
  commandWinProbability: SUBSCRIPTION_TIERS.PRO,
  commandAPM: SUBSCRIPTION_TIERS.FREE,
  commandAvg: SUBSCRIPTION_TIERS.FREE,
  commandDotabuff: SUBSCRIPTION_TIERS.FREE,
  commandGM: SUBSCRIPTION_TIERS.PRO,
  commandGPM: SUBSCRIPTION_TIERS.FREE,
  commandHero: SUBSCRIPTION_TIERS.PRO,
  commandLG: SUBSCRIPTION_TIERS.PRO,
  commandModsonly: SUBSCRIPTION_TIERS.FREE,
  commandNP: SUBSCRIPTION_TIERS.PRO,
  commandOpendota: SUBSCRIPTION_TIERS.FREE,
  commandPleb: SUBSCRIPTION_TIERS.FREE,
  commandSmurfs: SUBSCRIPTION_TIERS.PRO,
  commandProfile: SUBSCRIPTION_TIERS.PRO,
  commandLGS: SUBSCRIPTION_TIERS.FREE,
  commandSteam: SUBSCRIPTION_TIERS.FREE,
  commandXPM: SUBSCRIPTION_TIERS.FREE,
  commandBuilds: SUBSCRIPTION_TIERS.FREE,
  commandItems: SUBSCRIPTION_TIERS.PRO,
  commandVersion: SUBSCRIPTION_TIERS.FREE,
  commandResetwl: SUBSCRIPTION_TIERS.FREE,
  commandLocale: SUBSCRIPTION_TIERS.FREE,
  showRankMmr: SUBSCRIPTION_TIERS.FREE,
  showRankImage: SUBSCRIPTION_TIERS.FREE,
  showRankLeader: SUBSCRIPTION_TIERS.FREE,
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

// Add this constant at the top with other constants
export const GRACE_PERIOD_END = new Date('2025-04-30T23:59:59.999Z')

export function canAccessFeature(
  feature: FeatureTier | GenericFeature,
  subscription: Partial<SubscriptionRow> | null,
): { hasAccess: boolean; requiredTier: SubscriptionTier } {
  const requiredTier = getRequiredTier(feature)
  const isFreeFeature = requiredTier === SUBSCRIPTION_TIERS.FREE

  // Check if we're in the grace period (before April 30, 2025)
  // Grant Pro access to all users during this period
  if (isInGracePeriod()) {
    return {
      hasAccess: true, // All features are accessible during grace period
      requiredTier,
    }
  }

  // Return early if feature is free or subscription is invalid
  if (
    isFreeFeature ||
    !subscription?.status ||
    !subscription?.tier ||
    !isSubscriptionActive({ status: subscription.status })
  ) {
    return {
      hasAccess: isFreeFeature,
      requiredTier,
    }
  }

  // Check if subscription tier level meets required tier level
  return {
    hasAccess: TIER_LEVELS[subscription.tier] >= TIER_LEVELS[requiredTier],
    requiredTier,
  }
}

export function isSubscriptionActive(
  subscription: { status: SubscriptionStatus | null | undefined } | null,
): boolean {
  if (!subscription?.status) return false
  if (subscription.status === SubscriptionStatus.TRIALING) return true
  if (subscription.status === SubscriptionStatus.ACTIVE) return true
  return false
}

export interface SubscriptionPriceId {
  tier: SubscriptionTier
  monthly: string
  annual: string
  lifetime: string
}

export const PRICE_IDS: SubscriptionPriceId[] = [
  {
    tier: SUBSCRIPTION_TIERS.PRO,
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    annual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '',
    lifetime: process.env.NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID || '',
  },
]

export function getPriceId(
  tier: Exclude<SubscriptionTier, typeof SUBSCRIPTION_TIERS.FREE>,
  period: PricePeriod,
): string {
  const price = PRICE_IDS.find((p) => p.tier === tier)
  if (!price) throw new Error(`No price found for tier ${tier}`)
  if (period === 'monthly') return price.monthly
  if (period === 'annual') return price.annual
  return price.lifetime
}

export function getCurrentPeriod(priceId?: string | null): PricePeriod {
  if (!priceId) return 'monthly'
  if (PRICE_IDS.some((price) => price.monthly === priceId)) return 'monthly'
  if (PRICE_IDS.some((price) => price.annual === priceId)) return 'annual'
  if (PRICE_IDS.some((price) => price.lifetime === priceId)) return 'lifetime'
  return 'annual' // Default to annual if no match found
}

// Validation
if (PRICE_IDS.some((price) => !price.monthly || !price.annual || !price.lifetime)) {
  throw new Error('Missing required Stripe price IDs in environment variables')
}

export async function getSubscription(userId: string, tx?: Prisma.TransactionClient) {
  const subscription = await (tx || prisma).subscription.findFirst({
    where: {
      userId,
      OR: [
        // Active or trialing subscriptions
        { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
        // Include lifetime subscriptions
        { transactionType: 'LIFETIME' },
      ],
    },
    select: {
      tier: true,
      status: true,
      transactionType: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripePriceId: true,
      stripeCustomerId: true,
      createdAt: true,
      stripeSubscriptionId: true,
    },
    orderBy: [
      // Prioritize lifetime subscriptions first
      { transactionType: 'desc' },
      // Then active subscriptions
      { status: 'asc' },
      // Then most recent
      { createdAt: 'desc' },
    ],
  })

  if (!subscription && isInGracePeriod()) {
    return {
      tier: SUBSCRIPTION_TIERS.PRO,
      status: SubscriptionStatus.TRIALING,
      transactionType: TransactionType.RECURRING,
      currentPeriodEnd: GRACE_PERIOD_END,
      cancelAtPeriodEnd: true,
      stripePriceId: '',
      stripeCustomerId: '',
      createdAt: new Date(),
      stripeSubscriptionId: null,
    }
  }

  return subscription
}

export function calculateSavings(monthlyPrice: string, annualPrice: string): number {
  const monthly = Number.parseFloat(monthlyPrice.replace('$', '')) * 12
  const annual = Number.parseFloat(annualPrice.replace('$', ''))
  return Math.round(((monthly - annual) / monthly) * 100)
}

// Add these types at the top with other types
export type SubscriptionStatusInfo = {
  message?: string
  type: 'success' | 'warning' | 'error' | 'info'
  badge: 'gold' | 'blue' | 'red' | 'default'
}

// Update the getSubscriptionStatusInfo function
export function getSubscriptionStatusInfo(
  status: SubscriptionStatus | null | undefined,
  cancelAtPeriodEnd?: boolean,
  currentPeriodEnd?: Date | null,
  transactionType?: string | null,
  stripeSubscriptionId?: string | null,
): SubscriptionStatusInfo | null {
  // If we're in the grace period but user doesn't have a paid plan, show grace period message
  if (isInGracePeriod() && !(transactionType === 'LIFETIME' || stripeSubscriptionId)) {
    const daysRemaining = Math.ceil(
      (GRACE_PERIOD_END.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    )
    return {
      message: `Free Pro access until ${GRACE_PERIOD_END.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })} (${daysRemaining} days remaining)`,
      type: 'info',
      badge: 'gold',
    }
  }

  if (!status) return null

  // Check for lifetime subscription
  if (
    transactionType === 'LIFETIME' ||
    (status === SubscriptionStatus.ACTIVE &&
      currentPeriodEnd &&
      currentPeriodEnd.getFullYear() > 2090)
  ) {
    return {
      message: 'Lifetime access',
      type: 'success',
      badge: 'gold',
    }
  }

  // Format date in a more user-friendly way
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
    return new Date(date).toLocaleDateString(undefined, options)
  }

  const endDate = currentPeriodEnd ? formatDate(currentPeriodEnd) : 'unknown'

  // Check if subscription is ending within 10 days
  const isEndingSoon =
    currentPeriodEnd &&
    cancelAtPeriodEnd &&
    (new Date(currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 10

  // Calculate days remaining for better messaging
  const daysRemaining = currentPeriodEnd
    ? Math.ceil(
        (new Date(currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0

  switch (status) {
    case SubscriptionStatus.TRIALING:
      return {
        message: `Trial ends on ${endDate}`,
        type: 'info',
        badge: 'gold',
      }
    case SubscriptionStatus.ACTIVE:
      return {
        message: cancelAtPeriodEnd
          ? isEndingSoon
            ? `Ending in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
            : `Subscription ends on ${endDate}`
          : `Renews on ${endDate}`,
        type: cancelAtPeriodEnd ? (isEndingSoon ? 'warning' : 'info') : 'success',
        badge: cancelAtPeriodEnd ? (isEndingSoon ? 'red' : 'gold') : 'gold',
      }
    case SubscriptionStatus.PAST_DUE:
      return {
        message: 'Payment past due',
        type: 'error',
        badge: 'red',
      }
    case SubscriptionStatus.INCOMPLETE:
      return {
        message: 'Payment incomplete',
        type: 'warning',
        badge: 'red',
      }
    case SubscriptionStatus.INCOMPLETE_EXPIRED:
      return {
        message: 'Payment expired',
        type: 'error',
        badge: 'red',
      }
    case SubscriptionStatus.CANCELED:
      return {
        message: 'Subscription canceled',
        type: 'info',
        badge: 'default',
      }
    case SubscriptionStatus.UNPAID:
      return {
        message: 'Payment required',
        type: 'error',
        badge: 'red',
      }
    case SubscriptionStatus.PAUSED:
      return {
        message: 'Subscription paused',
        type: 'warning',
        badge: 'default',
      }
    default:
      return null
  }
}

// Add new helper for determining tier
export function getSubscriptionTier(
  priceId: string | null | undefined,
  status: SubscriptionStatus | null,
): SubscriptionTier {
  if (isSubscriptionActive({ status })) {
    const tierFromPrice = PRICE_IDS.find((price) =>
      [price.monthly, price.annual, price.lifetime].includes(priceId || ''),
    )?.tier

    return tierFromPrice || SUBSCRIPTION_TIERS.FREE
  }

  return SUBSCRIPTION_TIERS.FREE
}

// Add a function to check if we're in the grace period
export function isInGracePeriod(): boolean {
  return new Date() < GRACE_PERIOD_END
}

// Update the hasPaidSubscription check to include lifetime transactions
export function hasPaidPlan(subscription: Partial<SubscriptionRow> | null): boolean {
  if (!subscription) return false

  // Check for lifetime subscription
  if (subscription.transactionType === 'LIFETIME') return true

  // Check for recurring subscription with Stripe ID
  if (subscription.stripeSubscriptionId) return true

  return false
}
