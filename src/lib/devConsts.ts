import type { PollData } from '@/components/Overlay/PollOverlay'

const DEV_MODE_STORAGE_KEY = 'isDev'

export const isDev = () => {
  if (typeof window === 'undefined') return false

  const storage = window.localStorage
  if (!storage || typeof storage.getItem !== 'function') return false

  try {
    return storage.getItem(DEV_MODE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export type blockType = {
  matchId: number | null
  team: 'radiant' | 'dire' | null
  type: 'picks' | 'playing' | 'strategy' | 'strategy-2' | 'spectator' | null
}
export const devBlockTypes: blockType = {
  matchId: 123456789,
  team: 'radiant',
  type: 'playing',
}
export const devPoll: PollData = {
  endDate: new Date().getTime() + 300000,
  title: 'Will we win with Muerta?',
  choices: [
    {
      title: 'Always',
      totalVotes: 530104,
    },
    {
      title: 'Never',
      totalVotes: 323909,
    },
  ],
}
export const devRank = {
  image: '55.png',
  rank: 5500,
  leaderboard: 0,
}
export const devWL = [
  {
    win: 5,
    lose: 1,
    type: 'U',
  },
]

export const devRadiantWinChance = {
  value: 45,
  time: 256,
  visible: true,
}
