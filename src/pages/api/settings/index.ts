import type { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { settingCreateSchema } from '@/lib/validations/setting'
import { getServerSession } from 'next-auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  const userId = req.query.id as string | undefined
  const username = req.query.username as string | undefined

  if (username) {
    if (req.method === 'GET') {
      try {
        const data = await prisma.user.findFirstOrThrow({
          select: {
            settings: {
              select: {
                key: true,
                value: true,
              },
            },
          },
          where: {
            // and where setting key starts with "command"
            settings: {
              some: {
                key: {
                  startsWith: 'command',
                },
              },
            },
            name: username.toLowerCase(),
          },
        })

        if (!data) {
          return res.json({})
        }

        if (data?.settings) {
          data.settings = data.settings.filter((setting) =>
            setting.key.startsWith('command')
          )
        }

        return res.json(data)
      } catch (error) {
        return res.status(404).json({
          error: 'User not found',
        })
      }
    }
  }

  if (!userId && !session?.user?.id) {
    return res.status(403).json({ message: 'Unauthorized' })
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
              leaderboard_rank: true,
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
      return res.status(500)
    }
  }

  if (req.method === 'POST') {
    if (!session?.user?.id) {
      return res.status(403).json({ message: 'Unauthorized' })
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

      return res.status(500)
    }
  }
}

export default withMethods(['GET', 'POST'], withAuthentication(handler))
