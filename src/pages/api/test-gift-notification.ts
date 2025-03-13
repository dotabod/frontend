import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

/**
 * This is a test endpoint to create a gift notification for the current user.
 * It should only be used in development.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ message: 'This endpoint is only available in development mode' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const userId = session.user.id

    // Get gift type from query parameter or default to monthly
    const giftType = (req.query.giftType as string) || 'monthly'
    const validGiftTypes = ['monthly', 'annual', 'lifetime']

    if (!validGiftTypes.includes(giftType)) {
      return res
        .status(400)
        .json({ message: 'Invalid gift type. Must be monthly, annual, or lifetime' })
    }

    // Get gift message from request body or use default
    const giftMessage =
      req.body?.giftMessage || 'This is a test gift message. Enjoy your subscription!'

    // Create a test subscription with isGift flag
    const subscription = await prisma.subscription.create({
      data: {
        userId: userId,
        status: 'ACTIVE',
        tier: 'PRO',
        transactionType: 'RECURRING',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        cancelAtPeriodEnd: false,
        isGift: true,
      },
    })

    // Create a gift subscription record
    const giftSubscription = await prisma.giftSubscription.create({
      data: {
        subscriptionId: subscription.id,
        senderName: 'Test Sender',
        giftMessage: giftMessage,
        giftType: giftType,
        isViewed: false,
      },
    })

    // Create a notification for the gift
    const notification = await prisma.notification.create({
      data: {
        userId: userId,
        type: 'GIFT_SUBSCRIPTION',
        isRead: false,
        giftSubscriptionId: giftSubscription.id,
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Test gift notification created',
      notification,
      giftSubscription,
      subscription,
    })
  } catch (error) {
    console.error('Error creating test gift notification:', error)
    return res.status(500).json({ message: 'Internal server error', error: String(error) })
  }
}

export default withMethods(['GET', 'POST'], withAuthentication(handler))
