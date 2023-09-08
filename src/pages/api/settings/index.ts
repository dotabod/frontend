import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import * as z from 'zod'

import prisma from '@/lib/db'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { settingCreateSchema } from '@/lib/validations/setting'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })

  const userId = req.query.id as string

  if (!userId && !session?.user?.id) {
    return res.status(403).end()
  }

  if (req.method === 'GET') {
    try {
      const data = await prisma.user.findFirst({
        select: {
          stream_online: true,
          settings: {
            select: {
              key: true,
              value: true,
            },
          },
          beta_tester: true,
          Account: {
            select: {
              providerAccountId: true,
            },
          },
          SteamAccount: {
            select: {
              mmr: true,
              steam32Id: true,
            },
          },
          mmr: true,
          steam32Id: true,
        },
        where: {
          id: userId ?? session?.user?.id,
        },
      })

      if (!data) {
        return res.json({})
      }

      return res.json(data)
    } catch (error) {
      return res.status(500).end()
    }
  }

  if (req.method === 'POST') {
    if (!session?.user?.id) {
      return res.status(403).end()
    }

    try {
      const body = settingCreateSchema.parse(JSON.parse(req.body))

      const post = await prisma.setting.create({
        data: {
          key: body.key,
          value: body.value,
          userId: session.user.id,
        },
        select: {
          id: true,
        },
      })

      return res.json(post)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json(error.issues)
      }

      return res.status(500).end()
    }
  }
}

export default withMethods(['GET', 'POST'], withAuthentication(handler))
