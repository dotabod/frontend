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

    // Find all active gift subscriptions for the user
    const giftSubscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        isGift: true,
        status: 'ACTIVE',
      },
      include: {
        giftDetails: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Check if the user has any active gift subscriptions
    const hasGifts = giftSubscriptions.length > 0

    // Calculate total gift count
    const giftCount = giftSubscriptions.length

    // Check if any subscription is a lifetime gift
    const hasLifetime = giftSubscriptions.some(
      (sub) => sub.giftDetails?.giftType === 'lifetime' || sub.transactionType === 'LIFETIME',
    )

    // Get the user's pro expiration date
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { proExpiration: true },
    })

    // Format gift subscriptions for the response
    const formattedGifts = giftSubscriptions.map((sub) => ({
      id: sub.id,
      endDate: sub.currentPeriodEnd,
      senderName: sub.giftDetails?.senderName || 'Anonymous',
      giftType: sub.giftDetails?.giftType || 'monthly',
      giftQuantity: sub.giftDetails?.giftQuantity || 1,
      giftMessage: sub.giftDetails?.giftMessage || '',
      createdAt: sub.createdAt,
    }))

    // Create a message based on the gift status
    let giftMessage = ''
    if (hasLifetime) {
      giftMessage = 'You have a lifetime subscription!'
    } else if (hasGifts && user?.proExpiration) {
      const expirationDate = new Date(user.proExpiration)
      giftMessage = `Your Pro subscription is active until ${expirationDate.toLocaleDateString()}`
    } else if (hasGifts) {
      giftMessage = 'You have active gift subscriptions!'
    }

    // Only include proExpiration if there are actual gift subscriptions
    // or if the proExpiration is specifically from a gift
    const proExpiration = hasGifts ? user?.proExpiration : null

    return res.status(200).json({
      hasGifts,
      giftCount,
      hasLifetime,
      giftMessage,
      proExpiration,
      giftSubscriptions: formattedGifts,
    })
  } catch (error) {
    console.error('Error fetching gift subscriptions:', error)
    return res.status(500).json({ error: 'Failed to fetch gift subscriptions' })
  }
}
