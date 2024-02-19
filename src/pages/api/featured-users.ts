import { NextApiRequest, NextApiResponse } from 'next'

import prisma from '@/lib/db'
import { withMethods } from '@/lib/api-middlewares/with-methods'

// Helper function to fetch follower count for a user
async function fetchFollowerCount(providerAccountId, accessToken) {
  const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${Number(
    providerAccountId,
  )}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Client-Id': process.env.TWITCH_CLIENT_ID,
  }

  try {
    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(
        `Failed to fetch followers for providerAccountId ${providerAccountId}: ${response.statusText}`,
      )
    }
    const data = await response.json()
    return data.total
  } catch (error) {
    return null // Handle error gracefully, possibly returning null or a default value
  }
}

// Main function to update followers count
async function updateFollows() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        Account: {
          select: {
            providerAccountId: true,
            access_token: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        followers: null,
      },
    })

    for (const user of users) {
      if (!user.Account?.providerAccountId) continue

      const totalFollowerCount = await fetchFollowerCount(
        user.Account.providerAccountId,
        user.Account.access_token,
      )

      if (totalFollowerCount !== null) {
        await prisma.user.update({
          where: { id: user.id },
          data: { followers: totalFollowerCount },
        })
        console.log(
          `Updated followers for user ${user.name} to ${totalFollowerCount}`,
        )
      } else {
        // console.log(`Failed to update followers for user ${user.name}`)
        // do nothing
      }
    }
  } catch (error) {
    console.error('Failed to update followers:', error)
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(500).end()
  }

  try {
    const topLive = await prisma.user.findMany({
      take: 10,
      where: {
        followers: {
          gte: 1000,
        },
        Bet: {
          some: {
            updatedAt: {
              gte: new Date(new Date().getTime() - 60 * 60 * 1000), // 1 hour ago
            },
          },
        },
        stream_online: true,
      },
      orderBy: {
        followers: 'desc',
      },
      select: {
        name: true,
        image: true,
      },
    })

    const randomLive = await prisma.bet.findMany({
      take: 10,
      select: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      where: {
        updatedAt: {
          gte: new Date(new Date().getTime() - 60 * 60 * 1000), // 1 hour ago
        },
        user: {
          name: {
            notIn: topLive.map((bet) => bet.name),
          },
          stream_online: true,
        },
      },
    })

    return res.status(200).json({
      topLive,
      randomLive: randomLive.map((bet) => bet.user),
    })
  } catch (error) {
    return res.status(500).end()
  }
}

export default withMethods(['GET'], handler)
