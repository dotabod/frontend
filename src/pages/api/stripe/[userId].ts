import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: params.userId },
      select: {
        tier: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    })

    if (!subscription) {
      return res.status(200).json({
        tier: 'free',
        status: 'inactive',
      })
    }

    return res.status(200).json(subscription)
  } catch (error) {
    console.error('Error in subscription route:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
