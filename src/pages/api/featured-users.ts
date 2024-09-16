import type { NextApiRequest, NextApiResponse } from 'next'

import { withMethods } from '@/lib/api-middlewares/with-methods'
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'

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
    captureException(error)
    return res.status(500).end()
  }
}

export default withMethods(['GET'], handler)
