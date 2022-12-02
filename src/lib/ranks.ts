// Used for obs overlay
export async function getRankImage(deets) {
  if (!deets?.mmr) {
    return { image: '0.png', rank: null, leaderboard: false }
  }

  return {
    rank: deets.standing || deets.mmr,
    image: deets.myRank.image,
    leaderboard: !!deets.standing,
  }
}
