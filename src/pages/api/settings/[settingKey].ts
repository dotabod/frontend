import { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'

import { withMethods } from '@/lib/api-middlewares/with-methods'
import prisma from '@/lib/db'
import { settingPatchSchema } from '@/lib/validations/setting'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await unstable_getServerSession(req, res, authOptions)
  const settingKey = req.query.settingKey as string

  if (req.method === 'DELETE') {
    try {
      await prisma.setting.delete({
        where: {
          key_userId: {
            key: settingKey,
            userId: session?.user?.id,
          },
        },
      })

      return res.status(204).end()
    } catch (error) {
      return res.status(500).end()
    }
  }

  if (req.method === 'GET') {
    try {
      const setting = await prisma.setting.findFirst({
        where: {
          key: settingKey,
          userId: session?.user?.id,
        },
      })

      return res.json(setting)
    } catch (error) {
      return res.status(500).end()
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = settingPatchSchema.parse(JSON.parse(req.body))
      await prisma.setting.upsert({
        where: {
          key_userId: {
            key: settingKey,
            userId: session?.user?.id,
          },
        },
        update: {
          value: body.value,
        },
        create: {
          key: settingKey,
          value: body.value,
          userId: session?.user?.id,
        },
      })

      return res.end()
    } catch (error) {
      console.log(error)

      if (error instanceof z.ZodError) {
        return res.status(422).json(error.issues)
      }

      return res.status(422).end()
    }
  }
}

export default withMethods(
  ['DELETE', 'PATCH', 'GET'],
  withAuthentication(handler)
)
