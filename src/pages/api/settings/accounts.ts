import type { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'

const accountUpdateSchema = z.array(
  z.object({
    steam32Id: z.number().min(0),
    mmr: z.number().min(0).max(20000),
    name: z.string().optional(),
    delete: z.boolean().optional(),
  })
)

async function getAccounts(id: string) {
  try {
    const accounts = await prisma.steamAccount.findMany({
      select: {
        mmr: true,
        name: true,
        steam32Id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        leaderboard_rank: true,
        connectedUserIds: true,
      },
      where: {
        OR: [
          { userId: id },
          {
            connectedUserIds: {
              has: id,
            },
          },
        ],
      },
    })

    if (!accounts) {
      return []
    }

    accounts.forEach((account) => {
      if (account.user.id === id) {
        account.connectedUserIds = undefined
        account.user = undefined
        return
      }

      // filter connectedUserIds to only show the current user
      account.connectedUserIds = account.connectedUserIds.filter(
        (userId) => userId === id
      )
      // add the user using this account to the connectedUserIds array
      if (account.connectedUserIds.length) {
        account.connectedUserIds = [account.user.name]
      }
      account.user = undefined
    })

    return accounts
  } catch (error) {
    console.error(error, 'in getAccounts')
    return null
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const userId = req.query.id as string

  if (!userId && !session?.user?.id) {
    return res.status(403).end()
  }

  const accounts = await getAccounts(session ? session?.user?.id : userId)
  if (req.method === 'GET') {
    // Caught error
    if (!accounts) {
      return res.status(500).end()
    }

    return res.json({ accounts })
  }

  if (req.method === 'PATCH') {
    if (!session?.user?.id) {
      return res.status(403).end()
    }

    try {
      const promises = []
      const body = accountUpdateSchema.parse(JSON.parse(req.body))

      body
        .filter((a) => a.delete)
        .forEach((account) => {
          // Check if user has the steam accountid from body array
          if (!accounts.find((obj) => obj.steam32Id === account.steam32Id)) {
            return
          }

          promises.push(
            prisma.steamAccount.delete({
              where: {
                steam32Id: account.steam32Id,
              },
            })
          )
        })

      body
        .filter((a) => !a.delete)
        .forEach((account) => {
          // Check if user has the steam accountid from body array
          if (!accounts.find((obj) => obj.steam32Id === account.steam32Id)) {
            return
          }

          promises.push(
            prisma.steamAccount.update({
              data: {
                steam32Id: account.steam32Id,
                mmr: account.mmr,
              },
              where: {
                steam32Id: account.steam32Id,
              },
              select: {
                steam32Id: true,
                mmr: true,
                name: true,
              },
            })
          )
        })

      await Promise.all(promises).then((accounts) => {
        return res.json({ accounts: accounts.filter((a) => a.delete) })
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json(error.issues)
      }

      return res.status(500).end()
    }
  }
}

export default withMethods(['GET', 'PATCH'], withAuthentication(handler))
