import type { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { Settings } from '@/lib/defaultSettings'
import { settingKeySchema, settingSchema } from '@/lib/validations/setting'
import { getServerSession } from 'next-auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const settingKey = req.query.settingKey as string

  if (!settingKeySchema.safeParse(settingKey).success) {
    return res.status(422).json({ error: 'Invalid setting key' })
  }

  if (!session?.user?.id) {
    return res.status(500).end()
  }

  if (req.method === 'GET') {
    const setting = await prisma.setting.findFirst({
      where: {
        userId: session?.user?.id,
        key: settingKey,
      },
    })

    return res.status(200).json(setting)
  }

  if (req.method === 'PATCH') {
    try {
      const bodyJson = JSON.parse(req.body)
      bodyJson.key = settingKey

      const body = settingSchema.parse(bodyJson)
      if (settingKey === Settings.mmr) {
        await prisma.user.update({
          data: {
            mmr: body.value as number,
          },
          where: {
            id: session?.user?.id,
          },
        })

        return res.status(200).json({ status: 'ok' })
      }

      await prisma.setting.upsert({
        where: {
          key_userId: {
            key: body.key,
            userId: session?.user?.id,
          },
        },
        update: {
          value: body.value,
        },
        create: {
          key: body.key,
          value: body.value,
          userId: session?.user?.id,
        },
      })

      return res.status(200).json({ status: 'ok' })
    } catch (error) {
      console.log(error)

      if (error instanceof z.ZodError) {
        return res.status(422).json(error.issues)
      }

      return res.status(422).end()
    }
  }
}

export default withMethods(['PATCH'], withAuthentication(handler))
