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

    // Find the latest gift expiration date
    const latestGift = giftSubscriptions.reduce(
      (latest, current) => {
        if (!latest.currentPeriodEnd) return current
        if (!current.currentPeriodEnd) return latest
        return current.currentPeriodEnd > latest.currentPeriodEnd ? current : latest
      },
      { currentPeriodEnd: null } as (typeof giftSubscriptions)[0],
    )

    // Create a message based on the gift status
    let giftMessage = ''
    if (hasLifetime) {
      giftMessage = 'You have a lifetime subscription!'
    } else if (hasGifts && latestGift.currentPeriodEnd) {
      const expirationDate = new Date(latestGift.currentPeriodEnd)
      giftMessage = `Your Pro subscription is active until ${expirationDate.toLocaleDateString()}`
    } else if (hasGifts) {
      giftMessage = 'You have active gift subscriptions!'
    }

    return res.status(200).json({
      hasGifts,
      giftCount,
      hasLifetime,
      giftMessage,
      giftSubscriptions: formattedGifts,
    })
  } catch (error) {
    console.error('Error fetching gift subscriptions:', error)
    return res.status(500).json({ error: 'Failed to fetch gift subscriptions' })
  }
}
