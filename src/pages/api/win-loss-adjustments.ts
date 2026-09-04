import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Unauthorized' })
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

    return res.status(201).json(created)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json(error.issues)
    }

    captureException(error)
    console.error('Error creating win/loss adjustment:', error)
    return res.status(500).end()
  }
}

export default withMethods(['POST'], handler)
