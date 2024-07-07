import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import * as z from 'zod'

const accountUpdateSchema = z.array(
  z.object({
    steam32Id: z.number().min(0),
    mmr: z.number().min(0).max(30_000),
    name: z.string().max(500).optional(),
    delete: z.boolean().optional(),
  })
)

async function getAccounts(userId: string) {
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
          { userId: userId },
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
      if (account.user?.id === userId) {
        account.connectedUserIds = undefined
        account.user = undefined
      } else {
        account.connectedUserIds = account.connectedUserIds?.filter(
          (id) => id === userId
        )
        if (account.connectedUserIds?.length) {
          account.connectedUserIds = [account.user?.name]
        }
        account.user = undefined
      }
      return account
    })
  } catch (error) {
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

async function handlePatchRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const accounts = await getAccounts(userId)
  if (!accounts) {
    return res.status(403).end()
  }

  try {
    const accountUpdates = accountUpdateSchema.parse(JSON.parse(req.body))

    const updatePromises = accountUpdates
      .map((update) => {
        if (update.delete) {
          if (
            accounts.some((account) => account.steam32Id === update.steam32Id)
          ) {
            return prisma.steamAccount.delete({
              where: { steam32Id: update.steam32Id },
            })
          }
        } else {
          if (
            accounts.some((account) => account.steam32Id === update.steam32Id)
          ) {
            return prisma.steamAccount.update({
              data: { steam32Id: update.steam32Id, mmr: update.mmr },
              where: { steam32Id: update.steam32Id },
              select: { steam32Id: true, mmr: true, name: true },
            })
          }
        }
        return null
      })
      .filter(Boolean)

    const updatedAccounts = await Promise.all(updatePromises)
    return res.json({ accounts: updatedAccounts })
  } catch (error) {
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
