export enum DBSettings {
  obs = 'obs-scene-switcher',
  xl = 'minimap-xl',
  simple = 'minimap-simple',
  mblock = 'minimap-blocker',
  pblock = 'picks-blocker',
  obsMinimap = 'obs-minimap',
  obsPicks = 'obs-picks',
  obsDc = 'obs-dc',
  onlyBlockRanked = 'only-block-ranked',
  mmrTracker = 'mmr-tracker',
  mmr = 'mmr',
  bp = 'battlepass',
  bets = 'bets',
  chatter = 'chatter',
  rosh = 'rosh',
  aegis = 'aegis',
  minimapRight = 'minimapRight',
  commandWL = 'commandWL',
  commandXPM = 'commandXPM',
  commandGPM = 'commandGPM',
  commandAPM = 'commandAPM',
  commandPleb = 'commandPleb',
  commandModsonly = 'commandModsonly',
  commandHero = 'commandHero',
  commandNP = 'commandNP',
  commandGM = 'commandGM',
  commandLG = 'commandLG',
}

export const defaultSettings = {
  [DBSettings.obs]: true,
  [DBSettings.simple]: false,
  [DBSettings.xl]: false,
  [DBSettings.mblock]: true,
  [DBSettings.pblock]: true,
  [DBSettings.mmrTracker]: true,
  [DBSettings.onlyBlockRanked]: true,
  [DBSettings.obsMinimap]: '[dotabod] blocking minimap',
  [DBSettings.obsPicks]: '[dotabod] blocking picks',
  [DBSettings.obsDc]: '[dotabod] game disconnected',
  [DBSettings.mmr]: null,
  [DBSettings.bp]: false,
  [DBSettings.bets]: true,
  [DBSettings.chatter]: false,
  [DBSettings.rosh]: true,
  [DBSettings.aegis]: true,
  [DBSettings.minimapRight]: false,
  [DBSettings.commandWL]: true,
  [DBSettings.commandXPM]: true,
  [DBSettings.commandGPM]: true,
  [DBSettings.commandAPM]: true,
  [DBSettings.commandPleb]: true,
  [DBSettings.commandModsonly]: true,
  [DBSettings.commandHero]: true,
  [DBSettings.commandNP]: true,
  [DBSettings.commandGM]: true,
  [DBSettings.commandLG]: true,
}

export const getValueOrDefault = (data, key) => {
  if (!Array.isArray(data) || !data.length || !data.filter(Boolean).length) {
    return defaultSettings[key]
  }

  const dbVal = data?.find((s) => s.key === key)?.value

  // Undefined is not touching the option in FE yet
  // So we give them our best default
  if (dbVal === undefined) {
    return defaultSettings[key]
  }

  return dbVal
}

export const rankedModes = [2, 22]

const gameModeDescriptions = [
  { id: 0, name: '-', description: '-' },
  {
    id: 1,
    name: 'All Pick',
    description: 'Each player selects a hero from the entire hero pool.',
  },
  {
    id: 2,
    name: "Captain's Mode",
    description:
      'Each team is assigned a Captain, who makes all the hero selections for their team. Captains also ban heroes from the pool.',
  },
  {
    id: 3,
    name: 'Random Draft',
    description:
      "Players take turns selecting a hero from a shared pool of 33 random heroes. You will be told when it's your turn to select.",
  },
  {
    id: 4,
    name: 'Single Draft',
    description:
      'Each player selects a hero from a set of three heroes randomly chosen for them.',
  },
  {
    id: 5,
    name: 'All Random',
    description: 'Each player is randomly assigned a hero.',
  },
  { id: 6, name: '-', description: '-' },
  { id: 7, name: 'Diretide', description: 'Diretide' },
  {
    id: 8,
    name: "Reverse Captain's Mode",
    description: "Same as Captain's mode except team's pick for each other",
  },
  {
    id: 9,
    name: 'Greeviling',
    description:
      "Thanks to an infestation of wild Greevils, Frostivus has been cancelled! It's up to you and your tame pet Greevils to reclaim the holiday!",
  },
  { id: 10, name: 'Tutorial', description: 'Tutorial mode.' },
  {
    id: 11,
    name: 'Mid Only',
    description: 'Shuts off side lanes and allows the same hero to be picked.',
  },
  {
    id: 12,
    name: 'Least Played',
    description:
      'Players can only choose from a list of their least played heroes! This mode is great for learning new heroes since everyone will be on equal footing.',
  },
  {
    id: 13,
    name: 'New Player Pool',
    description: 'Play with heroes suitable for new players.',
  },
  {
    id: 14,
    name: 'Compendium Matchmaking',
    description: 'Play using the heroes picked in a featured match.',
  },
  {
    id: 16,
    name: 'Custom',
    description:
      'Each team is assigned a Captain, who bans and selects heroes from a limited pool.',
  },
  {
    id: 17,
    name: "Captain's Draft",
    description:
      'Each team is given 5 heroes that are automatically selected with an attempt to balance roles.',
  },
  {
    id: 18,
    name: 'Balanced Draft',
    description: 'Create a unique Hero by drafting from a pool of abilities.',
  },
  { id: 19, name: 'Ability Draft', description: '-' },
  {
    id: 20,
    name: 'All Random Deathmatch',
    description:
      'Players become a new hero every time they respawn.  Each team gets a total of 40 respawns.',
  },
  {
    id: 21,
    name: 'Solo Mid 1v1',
    description: 'Two players compete in the middle lane.',
  },
  {
    id: 22,
    name: 'Ranked All Pick',
    description:
      'Each team takes turns selecting a hero from the entire hero pool.',
  },
  {
    id: 23,
    name: 'Turbo',
    description: 'Its fast.',
  },
  {
    id: 24,
    name: 'Mutation',
    description: '???',
  },
]
