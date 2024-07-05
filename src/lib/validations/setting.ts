import * as z from 'zod'

// Define schemas for each specific setting
const settingsSchema = {
  aegis: z.boolean(),
  bets: z.boolean(),
  betsInfo: z.object({
    title: z
      .string()
      .max(45)
      .regex(
        /^(?:[a-zA-Z0-9.,!?:;\s]*|\[heroname\])*$/,
        'Title must be alphanumeric, include punctuation, or contain [heroname].'
      ),
    yes: z
      .string()
      .max(25)
      .regex(
        /^[a-zA-Z0-9.,!?:;\s]*$/,
        'Yes must be alphanumeric or include punctuation.'
      ),
    no: z
      .string()
      .max(25)
      .regex(
        /^[a-zA-Z0-9.,!?:;\s]*$/,
        'No must be alphanumeric or include punctuation.'
      ),
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
  }),
  commandAPM: z.boolean(),
  commandAvg: z.boolean(),
  commandCommands: z.boolean(),
  commandDisable: z.boolean(),
  commandDotabuff: z.boolean(),
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
  mmr: z.number().nullable(),
  'mmr-tracker': z.boolean(),
  'obs-scene-switcher': z.boolean(),
  'obs-dc': z
    .string()
    .regex(
      /^[a-zA-Z0-9.,!?:;\s\/\[\]]*$/,
      'Title must be alphanumeric or include allowed punctuation.'
    )
    .max(45),
  'obs-minimap': z
    .string()
    .regex(
      /^[a-zA-Z0-9.,!?:;\s\/\[\]]*$/,
      'Title must be alphanumeric or include allowed punctuation.'
    )
    .max(45),
  'obs-picks': z
    .string()
    .regex(
      /^[a-zA-Z0-9.,!?:;\s\/\[\]]*$/,
      'Title must be alphanumeric or include allowed punctuation.'
    )
    .max(45),
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
  winProbabilityOverlayIntervalMinutes: z.number().min(0),
  tellChatNewMMR: z.boolean(),
  tellChatBets: z.boolean(),
  queueBlocker: z.boolean(),
  queueBlockerFindMatch: z.boolean(),
  queueBlockerFindMatchText: z
    .string()
    .regex(/^[a-zA-Z0-9.,!?:;\s\/]*$/, 'Title must be alphanumeric.'),
  commandSpectators: z.boolean(),
  commandFacet: z.boolean(),
  commandInnate: z.boolean(),
  commandWinProbability: z.boolean(),
}

const settingSchemas = z.object(settingsSchema)
type SettingKeys = keyof typeof settingsSchema
export const settingKeySchema = z.enum(
  Object.keys(settingsSchema) as [SettingKeys, ...SettingKeys[]]
)

export const settingSchema = z.object({
  key: settingKeySchema,
  value: z.union([
    settingSchemas.shape.aegis,
    settingSchemas.shape.bets,
    settingSchemas.shape.betsInfo,
    settingSchemas.shape.battlepass,
    settingSchemas.shape.chatter,
    settingSchemas.shape.chatters,
    settingSchemas.shape.commandAPM,
    settingSchemas.shape.commandAvg,
    settingSchemas.shape.commandCommands,
    settingSchemas.shape.commandDisable,
    settingSchemas.shape.commandDotabuff,
    settingSchemas.shape.commandGM,
    settingSchemas.shape.commandGPM,
    settingSchemas.shape.commandHero,
    settingSchemas.shape.commandLG,
    settingSchemas.shape.commandModsonly,
    settingSchemas.shape.commandNP,
    settingSchemas.shape.commandOpendota,
    settingSchemas.shape.commandPleb,
    settingSchemas.shape.commandRanked,
    settingSchemas.shape.commandSmurfs,
    settingSchemas.shape.commandProfile,
    settingSchemas.shape.commandLGS,
    settingSchemas.shape.commandSteam,
    settingSchemas.shape.commandWL,
    settingSchemas.shape.commandXPM,
    settingSchemas.shape['minimap-blocker'],
    settingSchemas.shape.minimapRight,
    settingSchemas.shape.mmr,
    settingSchemas.shape['mmr-tracker'],
    settingSchemas.shape['obs-scene-switcher'],
    settingSchemas.shape['obs-dc'],
    settingSchemas.shape['obs-minimap'],
    settingSchemas.shape['obs-picks'],
    settingSchemas.shape['only-block-ranked'],
    settingSchemas.shape['picks-blocker'],
    settingSchemas.shape.rosh,
    settingSchemas.shape['minimap-simple'],
    settingSchemas.shape['minimap-xl'],
    settingSchemas.shape.onlyParty,
    settingSchemas.shape.livePolls,
    settingSchemas.shape.streamDelay,
    settingSchemas.shape.commandDelay,
    settingSchemas.shape.commandBuilds,
    settingSchemas.shape.showRankMmr,
    settingSchemas.shape.showRankImage,
    settingSchemas.shape.showRankLeader,
    settingSchemas.shape.commandMmr,
    settingSchemas.shape.commandRosh,
    settingSchemas.shape.commandItems,
    settingSchemas.shape.commandVersion,
    settingSchemas.shape.commandOnline,
    settingSchemas.shape.commandResetwl,
    settingSchemas.shape.commandLocale,
    settingSchemas.shape.notablePlayersOverlay,
    settingSchemas.shape.notablePlayersOverlayFlags,
    settingSchemas.shape.notablePlayersOverlayFlagsCmd,
    settingSchemas.shape.winProbabilityOverlay,
    settingSchemas.shape.winProbabilityOverlayIntervalMinutes,
    settingSchemas.shape.tellChatNewMMR,
    settingSchemas.shape.tellChatBets,
    settingSchemas.shape.queueBlocker,
    settingSchemas.shape.queueBlockerFindMatch,
    settingSchemas.shape.queueBlockerFindMatchText,
    settingSchemas.shape.commandSpectators,
    settingSchemas.shape.commandFacet,
    settingSchemas.shape.commandInnate,
    settingSchemas.shape.commandWinProbability,
  ]),
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
