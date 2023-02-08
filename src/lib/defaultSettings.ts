export const defaultSettings = {
  aegis: true,
  bets: true,
  betsInfo: {
    title: 'Will we win with [heroname]?',
    yes: 'Yes',
    no: 'No',
    duration: 4 * 60,
  },
  battlepass: false,
  chatter: true,
  chatters: {
    midas: {
      enabled: true,
    },
    pause: {
      enabled: true,
    },
    smoke: {
      enabled: true,
    },
    passiveDeath: {
      enabled: true,
    },
    roshPickup: {
      enabled: true,
    },
    roshDeny: {
      enabled: true,
    },
    roshanKilled: {
      enabled: true,
    },
    tip: {
      enabled: true,
    },
    bounties: {
      enabled: true,
    },
    powerTreads: {
      enabled: true,
    },
    killstreak: {
      enabled: true,
    },
    firstBloodDeath: {
      enabled: true,
    },
    noTp: {
      enabled: true,
    },
    matchOutcome: {
      enabled: true,
    },
    commandsReady: {
      enabled: true,
    },
  },
  commandAPM: true,
  commandAvg: true,
  commandCommands: true,
  commandDisable: false,
  commandDotabuff: true,
  commandGM: true,
  commandGPM: true,
  commandHero: true,
  commandLG: true,
  commandModsonly: true,
  commandNP: true,
  commandOpendota: true,
  commandPleb: true,
  commandRanked: true,
  commandSmurfs: true,
  commandWL: true,
  commandXPM: true,
  customMmr: '[currentmmr] | [currentrank] | Next rank at [nextmmr] [wins]',
  'minimap-blocker': true,
  minimapRight: false,
  mmr: null,
  'mmr-tracker': true,
  'obs-scene-switcher': true,
  'obs-dc': '[dotabod] game disconnected',
  'obs-minimap': '[dotabod] blocking minimap',
  'obs-picks': '[dotabod] blocking picks',
  'only-block-ranked': true,
  'picks-blocker': true,
  rosh: true,
  'minimap-simple': false,
  'minimap-xl': false,
  onlyParty: false,
  livePolls: true,
  streamDelay: 0,
  commandDelay: true,
  commandBuilds: true,
  showRankMmr: true,
  showRankImage: true,
  showRankLeader: true,
  commandMmr: true,
  commandRosh: true,
  commandItems: true,
  notablePlayersOverlay: true,
}
export type SettingKeys = keyof typeof defaultSettings
export const Settings = {} as Record<SettingKeys, SettingKeys>
Object.keys(defaultSettings).forEach((key) => {
  Settings[key as SettingKeys] = key as SettingKeys
})
