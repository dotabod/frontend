import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

// Schema for marking a notification as read
const markAsReadSchema = z.object({
  notificationId: z.string(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) {
      console.log('Unauthorized access attempt to gift notifications')
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const userId = session.user.id

    // GET: Fetch unread gift notifications and subscription status
    if (req.method === 'GET') {
      console.log(`Fetching gift notifications for user ${userId}`)

      try {
        // Find all unread notifications of type GIFT_SUBSCRIPTION
        const notifications = await prisma.notification.findMany({
          where: {
            userId: userId,
            type: 'GIFT_SUBSCRIPTION',
            isRead: false,
          },
          include: {
            giftSubscription: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        // Get active subscriptions to check if user has lifetime
        const activeSubscriptions = await prisma.subscription.findMany({
          where: {
            userId: userId,
            status: 'ACTIVE',
          },
          include: {
            giftDetails: true,
          },
        })

        // Check if user has a lifetime subscription
        const hasLifetime = activeSubscriptions.some(
          (sub) =>
            sub.giftDetails?.giftType === 'lifetime' ||
            (sub.tier === 'PRO' && sub.transactionType === 'LIFETIME'),
        )

        // Calculate total gifted months
        let totalGiftedMonths = 0

        for (const sub of activeSubscriptions) {
          if (sub.isGift && sub.giftDetails) {
            if (sub.giftDetails.giftType === 'lifetime') {
              totalGiftedMonths = Number.POSITIVE_INFINITY // Represent lifetime as infinity
              break
            }

            // Apply the gift quantity multiplier
            const quantity = sub.giftDetails.giftQuantity || 1

            if (sub.giftDetails.giftType === 'annual') {
              totalGiftedMonths += 12 * quantity
            } else if (sub.giftDetails.giftType === 'monthly') {
              totalGiftedMonths += 1 * quantity
            }
          }
        }

        // Format notifications for frontend
        const formattedNotifications = notifications
          .map((notification) => {
            if (!notification.giftSubscription) {
              return null
            }

            return {
              id: notification.id,
              senderName: notification.giftSubscription.senderName,
              giftMessage: notification.giftSubscription.giftMessage,
              giftType: notification.giftSubscription.giftType,
              giftQuantity: notification.giftSubscription.giftQuantity || 1,
              createdAt: notification.createdAt,
            }
          })
          .filter(Boolean)

        return res.status(200).json({
          hasNotification: formattedNotifications.length > 0,
          notifications: formattedNotifications,
          hasLifetime,
          totalGiftedMonths: hasLifetime ? 'lifetime' : totalGiftedMonths,
          totalNotifications: formattedNotifications.length,
        })
      } catch (error) {
        console.error('Error fetching gift notifications:', error)
        return res.status(500).json({ message: 'Internal server error', error: String(error) })
      }
    }

    // POST: Mark a notification as read
    if (req.method === 'POST') {
      try {
        // Validate request body
        const validationResult = markAsReadSchema.safeParse(req.body)
        if (!validationResult.success) {
          return res
            .status(400)
            .json({ message: 'Invalid request body', errors: validationResult.error.format() })
        }

        const { notificationId } = validationResult.data
        console.log(`Marking notification ${notificationId} as read for user ${userId}`)

        // Find the notification and ensure it belongs to the user
        const notification = await prisma.notification.findFirst({
          where: {
            id: notificationId,
            userId: userId,
          },
        })

        if (!notification) {
          return res.status(404).json({ message: 'Notification not found' })
        }

        // Mark notification as read
        await prisma.notification.update({
          where: {
            id: notificationId,
          },
          data: {
            isRead: true,
          },
        })

        return res.status(200).json({ message: 'Notification marked as read' })
      } catch (error) {
        console.error('Error marking notification as read:', error)
        return res.status(500).json({ message: 'Internal server error', error: String(error) })
      }
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    console.error('Unexpected error in gift notifications API:', error)
    return res.status(500).json({ message: 'Internal server error', error: String(error) })
  }
}

export default withMethods(['GET', 'POST'], withAuthentication(handler))
