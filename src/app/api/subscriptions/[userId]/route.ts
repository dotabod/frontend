import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import type { NextApiRequest, NextApiResponse } from 'next'

export async function GET(
  req: NextApiRequest,
  res: NextApiResponse,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
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
      return new Response(
        JSON.stringify({
          tier: 'free',
          status: 'inactive',
        })
      )
    }

    return new Response(JSON.stringify(subscription))
  } catch (error) {
    console.error('Error in subscription route:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
