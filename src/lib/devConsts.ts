import type { PollData } from '@/components/Overlay/PollOverlay'

const DEV_MODE_STORAGE_KEY = 'isDev'

export const isDev = () => {
  if (typeof window === 'undefined') {
    return false
  }

  const storage = window.localStorage
  if (!storage || typeof storage.getItem !== 'function') {
    return false
  }

  try {
    return storage.getItem(DEV_MODE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export interface blockType {
  matchId: number | null
  team: 'radiant' | 'dire' | null
  type: 'picks' | 'playing' | 'strategy' | 'strategy-2' | 'spectator' | null
}
export const devBlockTypes: blockType = {
  matchId: 123_456_789,
  team: 'radiant',
  type: 'playing',
}
export const devPoll: PollData = {
  choices: [
    {
      title: 'Always',
      totalVotes: 530_104,
    },
    {
      title: 'Never',
      totalVotes: 323_909,
    },
  ],
  endDate: Date.now() + 300_000,
  title: 'Will we win with Muerta?',
}
export const devRank = {
  image: '55.png',
  leaderboard: 0,
  rank: 5500,
}
export const devWL = [
  {
    lose: 1,
    type: 'U',
    win: 5,
  },
]

export const devRadiantWinChance = {
  time: 256,
  value: 45,
  visible: true,
}
