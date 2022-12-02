import { NextApiRequest, NextApiResponse } from 'next'

import prisma from '@/lib/db'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.query.id as string

  console.log(userId)

  if (!userId) {
    return res.status(500).end()
  }

  if (req.method === 'GET') {
    try {
      const data = await prisma.bet
        .groupBy({
          by: ['won', 'lobby_type'],
          _count: {
            won: true,
          },
          where: {
            userId,
            won: {
              not: null,
            },
            lobby_type: {
              not: null,
              in: [0, 7],
            },
            createdAt: {
              gte: new Date(new Date().getTime() - 12 * 60 * 60 * 1000),
            },
          },
        })
        .then((r) => {
          const ranked: { win: number; lose: number } = { win: 0, lose: 0 }
          const unranked: { win: number; lose: number } = { win: 0, lose: 0 }

          r.forEach((match) => {
            if (match.lobby_type === 7) {
              if (match.won) {
                ranked.win += match._count.won
              } else {
                ranked.lose += match._count.won
              }
            } else {
              if (match.won) {
                unranked.win += match._count.won
              } else {
                unranked.lose += match._count.won
              }
            }
          })

          return { ranked, unranked }
        })
        .catch((e) => {
          return { ranked: { win: 0, lose: 0 }, unranked: { win: 0, lose: 0 } }
        })

      return res.json(data)
    } catch (error) {
      console.log('OOPS 2', error)

      return res.status(500).end()
    }
  }

  return res.status(500).end()
}

export default withMethods(['GET'], withAuthentication(handler))
