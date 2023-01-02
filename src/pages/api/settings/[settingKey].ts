import { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'

import { withMethods } from '@/lib/api-middlewares/with-methods'
import prisma from '@/lib/db'
import { mmrPatchSchema, settingPatchSchema } from '@/lib/validations/setting'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DBSettings } from '@/lib/DBSettings'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await unstable_getServerSession(req, res, authOptions)
  const settingKey = req.query.settingKey as string

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

    return setting
  }

  if (req.method === 'PATCH') {
    try {
      if (settingKey === DBSettings.mmr) {
        const body = mmrPatchSchema.parse(JSON.parse(req.body))

        await prisma.user.update({
          data: {
            mmr: body.value,
          },
          where: {
            id: session?.user?.id,
          },
        })

        return res.end()
      }

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

export default withMethods(['PATCH'], withAuthentication(handler))
