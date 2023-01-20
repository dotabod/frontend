export type RankType = {
  mmr: number
  mmrToNextRank: number
  nextMMR: number
  winsToNextRank: number
  nextRank: {
    range: [number, number]
    title: string
    image: string
  }
  standing?: number
  myRank: {
    range: [number, number]
    title: string
    image: string
  }
}

// Used for obs overlay
export async function getRankImage(rank: RankType) {
  if (!rank?.mmr) {
    return { image: '0.png', rank: null, leaderboard: false }
  }

  return {
    rank: rank.mmr,
    image: rank.myRank.image,
    leaderboard: rank.standing,
  }
}
