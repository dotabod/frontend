import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'

import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
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
        return { ...accountData, canEdit: true }
      }

      const filteredConnections = connectedUserIds?.filter((id) => id === userId)
      if (filteredConnections?.length) {
        return {
          ...accountData,
          canEdit: false,
          connectedUserIds: user?.name ? [user.name] : [],
        }
      }

      return { ...accountData, canEdit: false }
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
  res.json({ accounts })
}

async function handlePatchRequest(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const accountUpdates = accountUpdateSchema.parse(JSON.parse(req.body))
    const requestedAccountIds = [...new Set(accountUpdates.map(({ steam32Id }) => steam32Id))]
    const ownedAccounts = requestedAccountIds.length
      ? await prisma.steamAccount.findMany({
          select: { steam32Id: true },
          where: {
            steam32Id: { in: requestedAccountIds },
            userId,
          },
        })
      : []

    const ownedAccountIds = new Set(ownedAccounts.map(({ steam32Id }) => steam32Id))
    if (requestedAccountIds.some((steam32Id) => !ownedAccountIds.has(steam32Id))) {
      return res.status(403).end()
    }

    const updatePromises = accountUpdates.map((update) => {
      if (update.delete) {
        return prisma.steamAccount.delete({
          where: { steam32Id: update.steam32Id },
        })
      }
      return prisma.steamAccount.update({
        data: { mmr: update.mmr, steam32Id: update.steam32Id, updatedAt: new Date() },
        select: { mmr: true, name: true, steam32Id: true },
        where: { steam32Id: update.steam32Id },
      })
    })

    const updatedAccounts = await prisma.$transaction(updatePromises)
    res.json({ accounts: updatedAccounts })
    return
  } catch (error) {
    captureException(error)
    if (error instanceof z.ZodError) {
      res.status(422).json(error.issues)
      return
    }
    console.error('Error in handlePatchRequest:', error)
    return res.status(500).end()
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const userId = session?.user?.id

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  if (req.method === 'GET') {
    return await handleGetRequest(res, userId)
  }

  if (req.method === 'PATCH') {
    return await handlePatchRequest(req, res, userId)
  }

  return res.status(405).end() // Method Not Allowed
}

export default withMethods(['GET', 'PATCH'], handler)
