import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { ranks } from '@/lib/ranks'

interface OpenDotaProfile {
  profile: {
    account_id: number
    personaname: string
    name: string | null
    plus: boolean
    cheese: number
    steamid: string
    avatar: string
    avatarmedium: string
    avatarfull: string
    profileurl: string
    last_login: string
    loccountrycode: string
    status: string | null
    fh_unavailable: boolean
    is_contributor: boolean
    is_subscriber: boolean
  }
  rank_tier: number
  leaderboard_rank: number | null
}

// Fetch player profile from OpenDota API
async function fetchOpenDotaProfile(accountId: number): Promise<OpenDotaProfile | null> {
  try {
    const response = await fetch(`https://api.opendota.com/api/players/${accountId}`)
    if (!response.ok) {
      throw new Error(`OpenDota API error: ${response.status}`)
    }
    return (await response.json()) as OpenDotaProfile
  } catch (error) {
    console.error('Failed to fetch player profile:', error)
    return null
  }
}

type Region =
  | 'EUROPE'
  | 'US EAST'
  | 'SINGAPORE'
  | 'ARGENTINA'
  | 'STOCKHOLM'
  | 'AUSTRIA'
  | 'DUBAI'
  | 'PERU'
  | 'BRAZIL'

function _estimateMMR(leaderboard_rank: number, region: Region): number {
  // Max leaderboard rank is 5000
  if (leaderboard_rank <= 0 || leaderboard_rank > 5000) {
    return 8500
  }

  let baseMMR: number
  const x = leaderboard_rank

  if (region === 'EUROPE') {
    baseMMR = 15_300 - 8.2 * Math.log(x) * x ** 0.6
  } else if (region === 'US EAST') {
    baseMMR = 14_900 - 7.8 * Math.log(x) * x ** 0.6
  } else if (region === 'SINGAPORE') {
    baseMMR = 14_750 - 7.6 * Math.log(x) * x ** 0.58
  } else if (region === 'ARGENTINA') {
    baseMMR = 14_500 - 7.9 * Math.log(x) * x ** 0.6
  } else if (region === 'STOCKHOLM') {
    baseMMR = 14_650 - 7.5 * Math.log(x) * x ** 0.59
  } else if (region === 'AUSTRIA') {
    baseMMR = 14_400 - 7.7 * Math.log(x) * x ** 0.61
  } else if (region === 'DUBAI') {
    baseMMR = 14_200 - 7.3 * Math.log(x) * x ** 0.6
  } else if (region === 'PERU') {
    baseMMR = 14_300 - 7.6 * Math.log(x) * x ** 0.58
  } else if (region === 'BRAZIL') {
    baseMMR = 14_150 - 7.4 * Math.log(x) * x ** 0.57
  } else {
    baseMMR = 14_000 - 7 * Math.log(x) * x ** 0.6
  }

  return Math.round(baseMMR)
}

export function rankTierToMmr(rankTier: string | number) {
  if (!Number(rankTier)) {
    return 0
  }
  const intRankTier = Number(rankTier)

  // Just gonna guess an immortal without standing is 6k mmr
  if (intRankTier > 77) {
    // Get the highest MMR from the ranks array
    const highestRankMMR = ranks.at(-1)?.range[1] || 5619
    return highestRankMMR + 50
  }

  // Floor to 5
  const stars = intRankTier % 10 > 5 ? 5 : intRankTier % 10
  const rank = ranks.find((rank) =>
    rank.image.startsWith(`${Math.floor(Number(intRankTier / 10))}${stars}`),
  )

  // Middle of range
  return ((rank?.range[0] ?? 0) + (rank?.range[1] ?? 0)) / 2
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Extract steam32Id from request body
  const { steam32Id } = req.body

  if (!steam32Id) {
    return res.status(400).json({ message: 'Missing steam32Id parameter' })
  }

  try {
    // Get the user session
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Check if the steam32Id is associated with the user
    const steamAccount = await prisma.steamAccount.findFirst({
      where: {
        OR: [{ userId: session.user.id }, { connectedUserIds: { has: session.user.id } }],
        steam32Id: Number.parseInt(steam32Id.toString(), 10),
      },
    })

    if (!steamAccount) {
      return res
        .status(404)
        .json({ message: 'Steam account not found or not associated with the user' })
    }

    // Fetch profile data from OpenDota API
    const accountId = Number.parseInt(steam32Id.toString(), 10)
    const profile = await fetchOpenDotaProfile(accountId)

    if (!profile) {
      return res.status(404).json({ message: 'Failed to fetch profile data from OpenDota' })
    }

    // Estimate MMR from rank tier if available
    const estimatedMMR = profile.rank_tier ? rankTierToMmr(profile.rank_tier) : 0

    // Update the steam account with the new MMR and leaderboard rank
    const updatedAccount = await prisma.steamAccount.update({
      data: {
        leaderboard_rank: profile.leaderboard_rank || null,
        mmr: estimatedMMR,
        updatedAt: new Date(),
      },
      where: {
        steam32Id: accountId,
      },
    })

    return res.status(200).json({
      data: {
        leaderboardRank: updatedAccount.leaderboard_rank,
        mmr: updatedAccount.mmr,
        steam32Id: updatedAccount.steam32Id,
      },
      profile,
      success: true,
    })
  } catch (error) {
    captureException(error)
    console.error('Error updating Steam account profile data:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default withMethods(['POST'], handler)
