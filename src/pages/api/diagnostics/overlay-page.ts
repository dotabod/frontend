import { Prisma } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

import { withMethods } from '@/lib/api-middlewares/with-methods'
import prisma from '@/lib/db'
import { SETUP_SIGNAL_KEYS } from '@/lib/setup-signal-keys'

const bodySchema = z.object({ userId: z.string().uuid() })

const handler = async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(422).json({ message: 'Invalid user ID' })
    return
  }

  const { userId } = parsed.data
  try {
    await prisma.setting.upsert({
      create: { key: SETUP_SIGNAL_KEYS.overlayPageLastSeen, userId, value: true },
      update: { updatedAt: new Date(), value: true },
      where: { key_userId: { key: SETUP_SIGNAL_KEYS.overlayPageLastSeen, userId } },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      res.status(404).json({ message: 'User not found' })
      return
    }
    throw error
  }
  return res.status(204).end()
}

export default withMethods(['POST'], handler)
