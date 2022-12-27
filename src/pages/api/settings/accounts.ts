import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import * as z from 'zod'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import prisma from '@/lib/db'

const accountUpdateSchema = z.array(
  z.object({
    steam32Id: z.number().min(0),
    mmr: z.number().min(0).max(20000),
    name: z.string(),
  })
)

async function getAccounts(id: string) {
  try {
    const accounts = await prisma.steamAccount.findMany({
      select: {
        mmr: true,
        name: true,
        steam32Id: true,
      },
      where: {
        userId: id,
      },
    })

    if (!accounts) {
      return []
    }

    return accounts
  } catch (error) {
    return null
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })
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
    try {
      const promises = []
      const body = accountUpdateSchema.parse(JSON.parse(req.body))
      const deletedAccounts = accounts.filter((obj) =>
        body.every((s) => s.steam32Id !== obj.steam32Id)
      )

      deletedAccounts.forEach((account) => {
        promises.push(
          prisma.steamAccount.delete({
            where: {
              steam32Id: account.steam32Id,
            },
          })
        )
      })

      body.forEach((account) => {
        // Check if user has the steam accountid from body array
        if (!accounts.find((obj) => obj.steam32Id === account.steam32Id)) {
          return
        }

        promises.push(
          prisma.steamAccount.update({
            data: {
              steam32Id: account.steam32Id,
              mmr: account.mmr,
              name: account.name,
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
        return res.json({ accounts })
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
