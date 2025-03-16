import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the current user session
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = session.user.id

    // Get the user with their pro expiration date
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        proExpiration: true,
        id: true,
        name: true,
        displayName: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Find active subscriptions for the user
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        tier: 'PRO',
      },
      orderBy: {
        currentPeriodEnd: 'desc',
      },
      include: {
        giftDetails: true,
      },
    })

    // Check if the user has a lifetime subscription
    const hasLifetime = activeSubscriptions.some(
      (sub) => sub.transactionType === 'LIFETIME' || sub.giftDetails?.giftType === 'lifetime',
    )

    // Check if the user has an active pro subscription
    const isProActive =
      hasLifetime || (user.proExpiration && new Date(user.proExpiration) > new Date())

    // Get the expiration date (null for lifetime)
    const expirationDate = hasLifetime ? null : user.proExpiration

    // Get subscription source information
    const subscriptionSources = activeSubscriptions.map((sub) => ({
      id: sub.id,
      type: sub.isGift ? 'GIFT' : 'DIRECT',
      expiresAt: sub.currentPeriodEnd,
      isLifetime: sub.transactionType === 'LIFETIME' || sub.giftDetails?.giftType === 'lifetime',
      giftDetails: sub.isGift
        ? {
            senderName: sub.giftDetails?.senderName || 'Anonymous',
            giftType: sub.giftDetails?.giftType || 'monthly',
            giftQuantity: sub.giftDetails?.giftQuantity || 1,
          }
        : null,
    }))

    return res.status(200).json({
      isPro: isProActive,
      expirationDate,
      hasLifetime,
      subscriptionSources,
      user: {
        id: user.id,
        name: user.name,
        displayName: user.displayName,
      },
    })
  } catch (error) {
    console.error('Error checking pro status:', error)
    return res.status(500).json({ error: 'Failed to check pro status' })
  }
}
