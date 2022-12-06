export type RankDeets = {
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
export async function getRankImage(deets: RankDeets) {
  if (!deets?.mmr) {
    return { image: '0.png', rank: null, leaderboard: false }
  }

  return {
    rank: deets.standing || deets.mmr,
    image: deets.myRank.image,
    leaderboard: !!deets.standing,
  }
}
