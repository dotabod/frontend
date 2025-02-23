import {
  FEATURE_TIERS,
  SUBSCRIPTION_TIERS,
  type SubscriptionStatus,
  TIER_LEVELS,
  isSubscriptionActive,
} from '@/utils/subscription'
import * as z from 'zod'

// Define schemas for each specific setting
const settingsSchema = {
  aegis: z.boolean(),
  bets: z.boolean(),
  betsInfo: z.object({
    title: z.string().max(45),
    yes: z.string().max(25),
    no: z.string().max(25),
    duration: z
      .string()
      .regex(/^\d+$/, 'Duration must be a numeric string')
      .transform((str) => Number.parseInt(str, 10))
      .refine((num) => num >= 30 && num <= 1800, {
        message: 'Duration must be between 30 and 1800 seconds',
      }),
  }),
  battlepass: z.boolean(),
  chatter: z.boolean(),
  chatters: z.object({
    midas: z.object({ enabled: z.boolean() }),
    pause: z.object({ enabled: z.boolean() }),
    smoke: z.object({ enabled: z.boolean() }),
    passiveDeath: z.object({ enabled: z.boolean() }),
    roshPickup: z.object({ enabled: z.boolean() }),
    roshDeny: z.object({ enabled: z.boolean() }),
    roshanKilled: z.object({ enabled: z.boolean() }),
    tip: z.object({ enabled: z.boolean() }),
    bounties: z.object({ enabled: z.boolean() }),
    powerTreads: z.object({ enabled: z.boolean() }),
    killstreak: z.object({ enabled: z.boolean() }),
    firstBloodDeath: z.object({ enabled: z.boolean() }),
    noTp: z.object({ enabled: z.boolean() }),
    matchOutcome: z.object({ enabled: z.boolean() }),
    commandsReady: z.object({ enabled: z.boolean() }),
    neutralItems: z.object({ enabled: z.boolean() }),
  }),
  commandAPM: z.boolean(),
  commandAvg: z.boolean(),
  commandCommands: z.boolean(),
  commandDisable: z.boolean(),
  commandDotabuff: z.boolean(),
  obsServerPassword: z.string().max(45),
  obsServerPort: z.number().min(1).max(65535),
  commandGM: z.boolean(),
  commandGPM: z.boolean(),
  commandHero: z.boolean(),
  commandLG: z.boolean(),
  commandModsonly: z.boolean(),
  commandNP: z.boolean(),
  commandOpendota: z.boolean(),
  commandPleb: z.boolean(),
  commandRanked: z.boolean(),
  commandSmurfs: z.boolean(),
  commandProfile: z.boolean(),
  commandLGS: z.boolean(),
  commandSteam: z.boolean(),
  commandWL: z.boolean(),
  commandXPM: z.boolean(),
  'minimap-blocker': z.boolean(),
  minimapRight: z.boolean(),
  mmr: z.number().min(0).max(30000),
  'mmr-tracker': z.boolean(),
  'obs-scene-switcher': z.boolean(),
  'obs-dc': z.string().max(200).max(45),
  'obs-minimap': z.string().max(200).max(45),
  'obs-picks': z.string().max(200).max(45),
  'only-block-ranked': z.boolean(),
  'picks-blocker': z.boolean(),
  rosh: z.boolean(),
  'minimap-simple': z.boolean(),
  'minimap-xl': z.boolean(),
  onlyParty: z.boolean(),
  livePolls: z.boolean(),
  streamDelay: z.number().min(0).max(60000),
  commandDelay: z.boolean(),
  commandBuilds: z.boolean(),
  showRankMmr: z.boolean(),
  showRankImage: z.boolean(),
  showRankLeader: z.boolean(),
  commandMmr: z.boolean(),
  commandRosh: z.boolean(),
  commandItems: z.boolean(),
  commandVersion: z.boolean(),
  commandOnline: z.boolean(),
  commandResetwl: z.boolean(),
  commandLocale: z.boolean(),
  notablePlayersOverlay: z.boolean(),
  notablePlayersOverlayFlags: z.boolean(),
  notablePlayersOverlayFlagsCmd: z.boolean(),
  winProbabilityOverlay: z.boolean(),
  winProbabilityOverlayIntervalMinutes: z.number().min(0).max(60),
  tellChatNewMMR: z.boolean(),
  tellChatBets: z.boolean(),
  queueBlocker: z.boolean(),
  queueBlockerFindMatch: z.boolean(),
  queueBlockerFindMatchText: z.string().max(45),
  commandSpectators: z.boolean(),
  commandFacet: z.boolean(),
  commandInnate: z.boolean(),
  commandShard: z.boolean(),
  commandAghs: z.boolean(),
  commandWinProbability: z.boolean(),
}

type SettingKeys = keyof typeof settingsSchema
export const settingKeySchema = z.enum(
  Object.keys(settingsSchema) as [SettingKeys, ...SettingKeys[]],
)

// Helper function to check if user can access a setting based on their subscription
export function canAccessSetting(
  settingKey: SettingKeys,
  subscription: SubscriptionStatus | null,
): boolean {
  const requiredTier = FEATURE_TIERS[settingKey] || SUBSCRIPTION_TIERS.PRO

  if (!subscription || !isSubscriptionActive({ status: subscription.status })) {
    return requiredTier === SUBSCRIPTION_TIERS.FREE
  }

  return TIER_LEVELS[subscription.tier] >= TIER_LEVELS[requiredTier]
}

// Add subscription validation to dynamic schema
export const dynamicSettingSchema = (key: SettingKeys, subscription: SubscriptionStatus | null) =>
  z
    .object({
      key: z.literal(key),
      value: settingsSchema[key],
    })
    .refine(() => canAccessSetting(key, subscription), {
      message: 'Your subscription tier does not have access to this feature',
    })

export const localePatchSchema = z.enum([
  'af-ZA',
  'ar-SA',
  'ca-ES',
  'cs-CZ',
  'da-DK',
  'de-DE',
  'el-GR',
  'es-ES',
  'fa-IR',
  'fi-FI',
  'fr-FR',
  'he-IL',
  'hu-HU',
  'it-IT',
  'ja-JP',
  'ko-KR',
  'nl-NL',
  'no-NO',
  'pl-PL',
  'pt-BR',
  'pt-PT',
  'ro-RO',
  'ru-RU',
  'sr-SP',
  'th-TH',
  'tl-PH',
  'sv-SE',
  'tr-TR',
  'uk-UA',
  'vi-VN',
  'zh-CN',
  'zh-TW',
  'en',
])
