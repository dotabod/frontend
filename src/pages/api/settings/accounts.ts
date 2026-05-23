import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

const accountUpdateSchema = z.array(
  z.object({
    delete: z.boolean().optional(),
    mmr: z.number().min(0).max(30_000),
    name: z.string().max(500).optional(),
    steam32Id: z.number().min(0),
  }),
)

async function getAccounts(userId: string) {
  try {
    const accounts = await prisma.steamAccount.findMany({
      select: {
        connectedUserIds: true,
        leaderboard_rank: true,
        mmr: true,
        name: true,
        steam32Id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      where: {
        OR: [
          { userId },
          {
            connectedUserIds: {
              has: userId,
            },
          },
        ],
      },
    })

    if (!accounts) {
      return []
    }

    return accounts.map((account) => {
      const { user, connectedUserIds, ...accountData } = account

      if (user?.id === userId) {
        return accountData
      }

      const filteredConnections = connectedUserIds?.filter((id) => id === userId)
      if (filteredConnections?.length) {
        return {
          ...accountData,
          connectedUserIds: user?.name ? [user.name] : [],
        }
      }

      return accountData
    })
  } catch (error) {
    captureException(error)
    console.error('Error in getAccounts:', error)
    return null
  }
}

async function handleGetRequest(res: NextApiResponse, userId: string) {
  const accounts = await getAccounts(userId)
  if (!accounts) {
    return res.status(500).end()
  }
  return res.json({ accounts })
}

async function handlePatchRequest(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const accounts = await getAccounts(userId)
  if (!accounts) {
    return res.status(403).end()
  }

  try {
    const accountUpdates = accountUpdateSchema.parse(JSON.parse(req.body))

    const updatePromises = accountUpdates
      .map((update) => {
        if (update.delete) {
          if (accounts.some((account) => account.steam32Id === update.steam32Id)) {
            return prisma.steamAccount.delete({
              where: { steam32Id: update.steam32Id },
            })
          }
        } else {
          if (accounts.some((account) => account.steam32Id === update.steam32Id)) {
            return prisma.steamAccount.update({
              data: { mmr: update.mmr, steam32Id: update.steam32Id, updatedAt: new Date() },
              select: { mmr: true, name: true, steam32Id: true },
              where: { steam32Id: update.steam32Id },
            })
          }
        }
        return null
      })
      .filter(Boolean)

    const updatedAccounts = await Promise.all(updatePromises)
    return res.json({ accounts: updatedAccounts })
  } catch (error) {
    captureException(error)
    if (error instanceof z.ZodError) {
      return res.status(422).json(error.issues)
    }
    console.error('Error in handlePatchRequest:', error)
    return res.status(500).end()
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const userId = session?.user?.id || (req.query.id as string)

  if (!userId) {
    return res.status(403).end()
  }

  if (req.method === 'GET') {
    return await handleGetRequest(res, userId)
  }

  if (req.method === 'PATCH') {
    return await handlePatchRequest(req, res, userId)
  }

  return res.status(405).end() // Method Not Allowed
}

export default withMethods(['GET', 'PATCH'], withAuthentication(handler))
