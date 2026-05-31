export interface RankType {
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

export const ranks = [
  { image: '11.png', range: [0, 153], title: 'Herald☆1' },
  { image: '12.png', range: [154, 307], title: 'Herald☆2' },
  { image: '13.png', range: [308, 461], title: 'Herald☆3' },
  { image: '14.png', range: [462, 615], title: 'Herald☆4' },
  { image: '15.png', range: [616, 769], title: 'Herald☆5' },
  { image: '21.png', range: [770, 923], title: 'Guardian☆1' },
  { image: '22.png', range: [924, 1077], title: 'Guardian☆2' },
  { image: '23.png', range: [1078, 1231], title: 'Guardian☆3' },
  { image: '24.png', range: [1232, 1385], title: 'Guardian☆4' },
  { image: '25.png', range: [1386, 1539], title: 'Guardian☆5' },
  { image: '31.png', range: [1540, 1693], title: 'Crusader☆1' },
  { image: '32.png', range: [1694, 1847], title: 'Crusader☆2' },
  { image: '33.png', range: [1848, 2001], title: 'Crusader☆3' },
  { image: '34.png', range: [2002, 2155], title: 'Crusader☆4' },
  { image: '35.png', range: [2156, 2309], title: 'Crusader☆5' },
  { image: '41.png', range: [2310, 2463], title: 'Archon☆1' },
  { image: '42.png', range: [2464, 2617], title: 'Archon☆2' },
  { image: '43.png', range: [2618, 2771], title: 'Archon☆3' },
  { image: '44.png', range: [2772, 2925], title: 'Archon☆4' },
  { image: '45.png', range: [2926, 3079], title: 'Archon☆5' },
  { image: '51.png', range: [3080, 3233], title: 'Legend☆1' },
  { image: '52.png', range: [3234, 3387], title: 'Legend☆2' },
  { image: '53.png', range: [3388, 3541], title: 'Legend☆3' },
  { image: '54.png', range: [3542, 3695], title: 'Legend☆4' },
  { image: '55.png', range: [3696, 3849], title: 'Legend☆5' },
  { image: '61.png', range: [3850, 4003], title: 'Ancient☆1' },
  { image: '62.png', range: [4004, 4157], title: 'Ancient☆2' },
  { image: '63.png', range: [4158, 4311], title: 'Ancient☆3' },
  { image: '64.png', range: [4312, 4465], title: 'Ancient☆4' },
  { image: '65.png', range: [4466, 4629], title: 'Ancient☆5' },
  { image: '71.png', range: [4630, 4829], title: 'Divine☆1' },
  { image: '72.png', range: [4830, 5029], title: 'Divine☆2' },
  { image: '73.png', range: [5030, 5229], title: 'Divine☆3' },
  { image: '74.png', range: [5230, 5429], title: 'Divine☆4' },
  { image: '75.png', range: [5430, 5629], title: 'Divine☆5' },
]

const leaderRanks = [
  { image: '92.png', range: [1, 1], sparklingEffect: true },
  { image: '92.png', range: [2, 10], sparklingEffect: true },
  { image: '91.png', range: [11, 100], sparklingEffect: true },
  { image: '80.png', range: [101, 1000], sparklingEffect: true },
  { image: '80.png', range: [1001, 100_000], sparklingEffect: false },
]

function lookupLeaderRank({ mmr, standing }: { mmr: number; standing: number | null }) {
  const lowestImmortalRank = leaderRanks.at(-1)
  const defaultNotFound = { mmr, myRank: lowestImmortalRank, standing }

  if (!standing) {
    return defaultNotFound
  }

  const [myRank] = leaderRanks.filter(
    (rank) => typeof standing === 'number' && standing <= rank.range[1],
  )
  return { mmr, myRank, standing }
}

export function getRankDetail(mmr: string | number, standing: number | null) {
  const mmrNum = Number(mmr)

  if (!mmrNum || mmrNum < 0) {
    return null
  }

  // Higher than max mmr? Lets check leaderboards
  const maxRank = ranks.at(-1)
  if (maxRank && mmrNum > maxRank.range[1]) {
    return lookupLeaderRank({ mmr: mmrNum, standing })
  }

  const [myRank, nextRank] = ranks.filter((rank) => mmrNum <= rank.range[1])

  // Its not always truthy, nextRank can be beyond the range
  const nextMMR = nextRank?.range[0] || myRank?.range[1]
  const mmrToNextRank = nextMMR - mmrNum
  const winsToNextRank = Math.ceil(mmrToNextRank / 30)

  return {
    mmr: mmrNum,
    mmrToNextRank,
    myRank,
    nextMMR,
    nextRank,
    winsToNextRank,
  }
}

// Used for obs overlay
export function getRankImage(rank: RankType) {
  if (!rank?.mmr) {
    return { image: '0.png', leaderboard: 0, rank: null }
  }

  return {
    image: rank.myRank?.image ?? '0.png',
    leaderboard: rank.standing ?? null,
    rank: rank.mmr,
  }
}

// Rank tiers in ascending order. Each tier's position (1-based) is the medal digit used
// in the `ranks` images (1 = Herald ... 7 = Divine). Immortal sits above the highest
// non-leaderboard rank.
export const rankTiers = [
  { key: 'herald' },
  { key: 'guardian' },
  { key: 'crusader' },
  { key: 'archon' },
  { key: 'legend' },
  { key: 'ancient' },
  { key: 'divine' },
  { key: 'immortal' },
] as const

export type RankTierKey = (typeof rankTiers)[number]['key']

// Maps a tier key to the MMR bounds used for filtering. Immortal has no upper bound
// and starts one point above Divine☆5. Returns null for an unknown tier.
export function tierMmrRange(key: string): { gte?: number; lte?: number } | null {
  if (key === 'immortal') {
    const divineMax = ranks.at(-1)?.range[1] ?? 0
    return { gte: divineMax + 1 }
  }
  const index = rankTiers.findIndex((t) => t.key === key)
  if (index === -1) {
    return null
  }
  // The tier's 1-based position is the leading medal digit in its `ranks` image filenames.
  const group = ranks.filter((rank) => Number(rank.image[0]) === index + 1)
  if (group.length === 0) {
    return null
  }
  // mmr 0 is the default for users with no tracked MMR (uncalibrated), not a genuine
  // Herald, so the lowest tier starts at 1 to keep unknown-rank users out of rank buckets.
  const lo = group[0].range[0]
  return { gte: lo === 0 ? 1 : lo, lte: group.at(-1)?.range[1] }
}

export function getRankTitle(rankTier?: string | number): string {
  if (!rankTier || Number(rankTier) === 0) {
    return 'Uncalibrated'
  }
  const intRankTier = Number(rankTier)

  // Immortal rank
  if (intRankTier > 77) {
    return 'Immortal'
  }

  // Floor to 5
  // Extract the stars value from the rank tier (last digit of the number)
  // If the stars value is greater than 5, cap it at 5 since ranks only go up to 5 stars
  // For example: rank tier 53 means Legend 3, where 5 is the medal and 3 is the stars
  const stars = intRankTier % 10 > 5 ? 5 : intRankTier % 10
  const rank = ranks.find((rank) =>
    rank.image.startsWith(`${Math.floor(Number(intRankTier / 10))}${stars}`),
  )

  return rank?.title ?? 'Unknown'
}

// --- Streamers directory grouping --------------------------------------------

export type StreamerTier = RankTierKey | 'unranked'

// Highest tier first, with uncalibrated streamers collected at the end so nobody
// silently drops off the directory.
export const tierDisplayOrder: StreamerTier[] = [
  'immortal',
  'divine',
  'ancient',
  'legend',
  'archon',
  'crusader',
  'guardian',
  'herald',
  'unranked',
]

// One representative medal per tier for section headers: the 5-star medal of the
// bracket, the low-immortal medal for Immortal, the empty medal for uncalibrated.
export const tierEmblem: Record<StreamerTier, string> = {
  immortal: '80.png',
  divine: '75.png',
  ancient: '65.png',
  legend: '55.png',
  archon: '45.png',
  crusader: '35.png',
  guardian: '25.png',
  herald: '15.png',
  unranked: '0.png',
}

export const tierLabel: Record<StreamerTier, string> = {
  immortal: 'Immortal',
  divine: 'Divine',
  ancient: 'Ancient',
  legend: 'Legend',
  archon: 'Archon',
  crusader: 'Crusader',
  guardian: 'Guardian',
  herald: 'Herald',
  unranked: 'Uncalibrated',
}

// Resolve a streamer into a single tier bucket. Immortal is a leaderboard standing
// (or MMR above Divine); mmr<=0 means uncalibrated, not Herald.
export function tierForRank(mmr: number, standing: number | null): StreamerTier {
  const divineMax = ranks.at(-1)?.range[1] ?? 5629
  if ((standing && standing > 0) || mmr > divineMax) {
    return 'immortal'
  }
  if (!mmr || mmr <= 0) {
    return 'unranked'
  }
  const tier = rankTiers.find((t) => {
    if (t.key === 'immortal') {
      return false
    }
    const range = tierMmrRange(t.key)
    return (
      range != null && mmr >= (range.gte ?? 0) && mmr <= (range.lte ?? Number.POSITIVE_INFINITY)
    )
  })
  return (tier?.key as StreamerTier) ?? 'unranked'
}

// Human-readable MMR band shown under each section header.
export function tierRangeLabel(tier: StreamerTier): string {
  if (tier === 'immortal') {
    return 'Leaderboard'
  }
  if (tier === 'unranked') {
    return 'MMR not tracked'
  }
  const range = tierMmrRange(tier)
  if (!range) {
    return ''
  }
  return `${(range.gte ?? 0).toLocaleString()}–${(range.lte ?? 0).toLocaleString()} MMR`
}
