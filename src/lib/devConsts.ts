import { PollData } from '@/components/Overlay/PollOverlay'

export const devBlockTypes = {
  matchId: 123456789,
  team: 'radiant',
  type: 'picks',
}
export const devPoll: PollData = {
  endDate: new Date().getTime() + 1000 * 60 * 60 * 24,
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
