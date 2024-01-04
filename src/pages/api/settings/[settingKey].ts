import { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'

import { withMethods } from '@/lib/api-middlewares/with-methods'
import prisma from '@/lib/db'
import {
  mmrPatchSchema,
  settingKeySchema,
  settingPatchSchema,
  streamDelaySchema,
} from '@/lib/validations/setting'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Settings } from '@/lib/defaultSettings'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const settingKey = req.query.settingKey as string
  settingKeySchema.parse(settingKey)

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
      if (settingKey === Settings.mmr) {
        const body = mmrPatchSchema.parse(JSON.parse(req.body))

        await prisma.user.update({
          data: {
            mmr: body.value,
          },
          where: {
            id: session?.user?.id,
          },
        })

        return res.status(200).json({ status: 'ok' })
      }

      if (settingKey === Settings.streamDelay) {
        streamDelaySchema.parse(JSON.parse(req.body))
      }

      const bodyJson = JSON.parse(req.body)
      bodyJson.key = settingKey

      const body = settingPatchSchema.parse(bodyJson)

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
