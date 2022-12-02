// Used for obs overlay
export async function getRankImage(deets) {
  if (!deets?.mmr) {
    return { image: '0.png', rank: null, leaderboard: false }
  }

  // Immortal rankers don't have a nextRank
  if (!('nextRank' in deets)) {
    return { rank: deets.standing, image: deets.image, leaderboard: true }
  }

  return { rank: deets?.mmr, image: deets.myRank.image, leaderboard: false }
}
