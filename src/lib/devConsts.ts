import { PollData } from '@/components/Overlay/PollOverlay'

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
  endDate: new Date().getTime() + 30000,
  title: 'What is your favorite color?',
  choices: [
    {
      title: 'Blue',
      totalVotes: 500000,
    },
    {
      title: 'Red',
      totalVotes: 300000,
    },
  ],
}
export const devRank = {
  image: '55.png',
  rank: 5500,
  leaderboard: false,
  notLoaded: null,
}
export const devWL = [
  {
    win: 5,
    lose: 1,
    type: 'U',
  },
]
