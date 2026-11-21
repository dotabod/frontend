import * as z from 'zod'

import { defaultSettings } from '@/lib/default-settings'
import type { SettingKeys } from '@/lib/default-settings'
import { canAccessFeature } from '@/utils/subscription'
import type { SubscriptionRow } from '@/utils/subscription'

type BooleanSettingKey = {
  [Key in SettingKeys]: (typeof defaultSettings)[Key] extends boolean ? Key : never
}[SettingKeys]

type WritableSettingKey = Exclude<SettingKeys, 'customMmr'>
type ExplicitSettingKey = Exclude<WritableSettingKey, BooleanSettingKey>

const explicitSettingSchemas = {
  autoCommandsOnMatchStart: z.array(z.string().max(45)),
  betsInfo: z.object({
    duration: z
      .string()
      .regex(/^\d+$/u, 'Duration must be a numeric string')
      .transform((str) => Math.trunc(Number(str)))
      .refine((num) => num >= 30 && num <= 1800, {
        message: 'Duration must be between 30 and 1800 seconds',
      }),
    no: z.string().max(25),
    title: z.string().max(45),
    yes: z.string().max(25),
  }),
  chatters: z
    .object({
      bounties: z.object({ enabled: z.boolean() }),
      commandsReady: z.object({ enabled: z.boolean() }),
      dotapatch: z.object({ enabled: z.boolean() }),
      firstBloodDeath: z.object({ enabled: z.boolean() }),
      killstreak: z.object({ enabled: z.boolean() }),
      matchOutcome: z.object({ enabled: z.boolean() }),
      midas: z.object({ enabled: z.boolean() }),
      neutralItems: z.object({ enabled: z.boolean() }),
      noTp: z.object({ enabled: z.boolean() }),
      passiveDeath: z.object({ enabled: z.boolean() }),
      pause: z.object({ enabled: z.boolean() }),
      powerTreads: z.object({ enabled: z.boolean() }),
      roshDeny: z.object({ enabled: z.boolean() }),
      roshPickup: z.object({ enabled: z.boolean() }),
      roshanKilled: z.object({ enabled: z.boolean() }),
      smoke: z.object({ enabled: z.boolean() }),
      tip: z.object({ enabled: z.boolean() }),
    })
    .partial(),
  cosmeticsAnnounce: z.boolean(),
  crypto_payment_interest: z.object({
    interested: z.boolean(),
    tier: z.enum(['FREE', 'PRO']),
    transactionType: z.enum(['RECURRING', 'LIFETIME']),
  }),
  lastFmRefreshRate: z.number().min(5).max(60),
  lastFmUsername: z.string().max(45).optional(),
  'minimap-opacity': z.number().min(0).max(1),
  mmr: z.number().min(0).max(30_000),
  'obs-dc': z.string().max(200).max(45),
  'obs-minimap': z.string().max(200).max(45),
  'obs-picks': z.string().max(200).max(45),
  obsServerPassword: z.string().max(45),
  obsServerPort: z.number().min(1).max(65_535),
  queueBlockerFindMatchText: z.string().max(45),
  rankOnly: z.object({
    enabled: z.boolean(),
    minimumRank: z.enum([
      'Herald',
      'Guardian',
      'Crusader',
      'Archon',
      'Legend',
      'Ancient',
      'Divine',
      'Immortal',
    ]),
    minimumRankTier: z.number().min(0).max(100),
  }),
  smokeActivated: z.boolean(),
  streamDelay: z.number().min(0).max(3_000_000),
  translationLanguage: z.string().max(5),
  winProbabilityOverlayIntervalMinutes: z.number().min(0).max(60),
  wlStatsDays: z.number().int().min(1).max(365).nullable(),
  wlStatsStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`)
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    })
    .nullable(),
} satisfies Record<ExplicitSettingKey, z.ZodType>

const booleanSettingSchema = z.boolean()
const writableSettingKeys = new Set<unknown>([
  ...Object.keys(explicitSettingSchemas),
  ...Object.entries(defaultSettings).flatMap(([key, value]) =>
    booleanSettingSchema.safeParse(value).success ? [key] : [],
  ),
])

const hasExplicitSettingSchema = (key: WritableSettingKey): key is ExplicitSettingKey =>
  Object.hasOwn(explicitSettingSchemas, key)

export const settingKeySchema = z.custom<WritableSettingKey>((key) => writableSettingKeys.has(key))

export const dynamicSettingSchema = (
  key: WritableSettingKey,
  subscription: Partial<SubscriptionRow> | null,
) =>
  z
    .object({
      key: z.literal(key),
      value: hasExplicitSettingSchema(key) ? explicitSettingSchemas[key] : booleanSettingSchema,
    })
    .refine(() => canAccessFeature(key, subscription).hasAccess, {
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
