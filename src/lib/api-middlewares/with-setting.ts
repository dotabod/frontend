import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth/next'
import * as z from 'zod'

import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const schema = z.object({
  settingKey: z.string(),
})

export function withSetting(handler: NextApiHandler) {
  return async function (req: NextApiRequest, res: NextApiResponse) {
    const session = await unstable_getServerSession(req, res, authOptions)

    try {
      const query = await schema.parse(req.query)

      // Check if the user has access to this setting.
      const session = await unstable_getServerSession(req, res, authOptions)
      const count = await prisma.setting.count({
        where: {
          key: query.settingKey,
          userId: session.user.id,
        },
      })

      if (count < 1) {
        await prisma.setting.create({
          data: {
            userId: session?.user?.id,
            key: query.settingKey,
            value: null,
          },
          select: {
            id: true,
          },
        })
      }

      return handler(req, res)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json(error.issues)
      }

      return res.status(500).end()
    }
  }
}
