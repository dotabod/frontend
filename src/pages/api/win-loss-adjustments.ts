import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

const adjustmentSchema = z.object({
  delta: z
    .number()
    .int()
    .min(-1000)
    .max(1000)
    .refine((value) => value !== 0),
  lobbyType: z.union([z.literal(0), z.literal(7)]),
  won: z.boolean(),
})

const handler = async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    res.status(403).json({ message: 'Unauthorized' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const adjustment = adjustmentSchema.parse(body)
    const created = await prisma.winLossAdjustment.create({
      data: {
        ...adjustment,
        userId: session.user.id,
      },
      select: { createdAt: true },
    })

    res.status(201).json(created)
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(422).json(error.issues)
      return
    }

    captureException(error)
    console.error('Error creating win/loss adjustment:', error)
    return res.status(500).end()
  }
}

export default withMethods(['POST'], handler)
