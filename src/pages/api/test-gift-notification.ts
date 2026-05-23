import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

/**
 * This is a test endpoint to create a gift notification for the current user.
 * It should only be used in development.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (!session?.user?.role?.includes('admin')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
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

    // Get gift quantity from request body or use default
    const giftQuantity = Number.parseInt(req.body?.giftQuantity || '1', 10)

    // Validate gift quantity
    if (Number.isNaN(giftQuantity) || giftQuantity < 1) {
      return res.status(400).json({ message: 'Gift quantity must be a positive number' })
    }

    // For lifetime, enforce quantity = 1
    const finalGiftQuantity = giftType === 'lifetime' ? 1 : giftQuantity

    // Check if user already has a lifetime subscription
    if (giftType === 'lifetime') {
      const existingLifetime = await prisma.subscription.findFirst({
        where: {
          OR: [
            {
              transactionType: 'LIFETIME',
            },
            {
              giftDetails: {
                giftType: 'lifetime',
              },
              isGift: true,
            },
          ],
          status: 'ACTIVE',
          userId,
        },
      })

      if (existingLifetime) {
        // For testing purposes, we'll still create the notification but add a warning
        console.warn(
          `User ${userId} already has a lifetime subscription but creating a test notification anyway`,
        )
      }
    }

    // Calculate the end date based on quantity
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

    // If quantity > 1, extend the period end date
    if (finalGiftQuantity > 1) {
      if (giftType === 'monthly') {
        // Add (quantity - 1) months to the end date
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + (finalGiftQuantity - 1))
      } else if (giftType === 'annual') {
        // Add (quantity - 1) years to the end date
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + (finalGiftQuantity - 1))
      }
    }

    // Create a test subscription with isGift flag
    const subscription = await prisma.subscription.create({
      data: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd,
        isGift: true,
        status: 'ACTIVE',
        tier: 'PRO',
        transactionType: 'RECURRING',
        userId,
      },
    })

    // Create a gift subscription record
    const giftSubscription = await prisma.giftSubscription.create({
      data: {
        giftMessage,
        giftQuantity: finalGiftQuantity,
        giftType,
        senderName: 'Test Sender',
        subscriptionId: subscription.id,
      },
    })

    // Create a notification for the gift
    const notification = await prisma.notification.create({
      data: {
        giftSubscriptionId: giftSubscription.id,
        isRead: false,
        type: 'GIFT_SUBSCRIPTION',
        userId,
      },
    })

    // Get total active gift subscriptions for this user
    const activeGiftSubscriptions = await prisma.subscription.findMany({
      include: {
        giftDetails: true,
      },
      where: {
        isGift: true,
        status: 'ACTIVE',
        userId,
      },
    })

    // Calculate total gifted months
    let totalGiftedMonths = 0
    let hasLifetime = false

    for (const sub of activeGiftSubscriptions) {
      if (sub.giftDetails?.giftType === 'lifetime') {
        hasLifetime = true
        break
      }

      if (sub.giftDetails?.giftType === 'annual') {
        // Apply the gift quantity multiplier
        const quantity = sub.giftDetails.giftQuantity || 1
        totalGiftedMonths += 12 * quantity
      } else if (sub.giftDetails?.giftType === 'monthly') {
        // Apply the gift quantity multiplier
        const quantity = sub.giftDetails.giftQuantity || 1
        totalGiftedMonths += Number(quantity)
      }
    }

    return res.status(200).json({
      giftSubscription,
      hasLifetime,
      message: 'Test gift notification created',
      notification,
      subscription,
      success: true,
      totalGiftedMonths: hasLifetime ? 'lifetime' : totalGiftedMonths,
    })
  } catch (error) {
    console.error('Error creating test gift notification:', error)
    return res.status(500).json({ error: String(error), message: 'Internal server error' })
  }
}

export default withMethods(['GET', 'POST'], withAuthentication(handler))
