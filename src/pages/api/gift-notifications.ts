import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

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

    // GET: Fetch gift notifications and subscription status
    if (req.method === 'GET') {
      try {
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')

        // Check if we should include read notifications
        const includeRead = req.query.includeRead === 'true'

        // Find notifications of type GIFT_SUBSCRIPTION
        // Only filter by isRead if includeRead is false
        const notifications = await prisma.notification.findMany({
          include: {
            giftSubscription: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          where: {
            type: 'GIFT_SUBSCRIPTION',
            userId,
            ...(includeRead ? {} : { isRead: false }),
          },
        })

        // Get active subscriptions to check if user has lifetime
        const activeSubscriptions = await prisma.subscription.findMany({
          include: {
            giftDetails: true,
          },
          where: {
            status: 'ACTIVE',
            userId,
          },
        })

        // Check if user has a lifetime subscription
        const hasLifetime = activeSubscriptions.some(
          (sub) =>
            sub.giftDetails?.giftType === 'lifetime' ||
            (sub.tier === 'PRO' && sub.transactionType === 'LIFETIME'),
        )

        // Format notifications for frontend
        const formattedNotifications = notifications
          .map((notification) => {
            if (!notification.giftSubscription) {
              return null
            }

            return {
              createdAt: notification.createdAt,
              giftMessage: notification.giftSubscription.giftMessage,
              giftQuantity: notification.giftSubscription.giftQuantity || 1,
              giftType: notification.giftSubscription.giftType,
              id: notification.id,
              read: notification.isRead, // Include read status in the response
              senderName: notification.giftSubscription.senderName,
            }
          })
          .filter(Boolean)

        return res.status(200).json({
          hasLifetime,
          hasNotification: formattedNotifications.some((n) => n !== null && !n.read), // Check for null before accessing read property
          notifications: formattedNotifications,
          totalNotifications: formattedNotifications.length,
        })
      } catch (error) {
        console.error('Error fetching gift notifications:', error)
        return res.status(500).json({ error: String(error), message: 'Internal server error' })
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
            .json({ errors: validationResult.error.format(), message: 'Invalid request body' })
        }

        const { notificationId } = validationResult.data

        // Find the notification and ensure it belongs to the user
        const notification = await prisma.notification.findFirst({
          where: {
            id: notificationId,
            userId,
          },
        })

        if (!notification) {
          return res.status(404).json({ message: 'Notification not found' })
        }

        // Mark notification as read
        await prisma.notification.update({
          data: {
            isRead: true,
            updatedAt: new Date(),
          },
          where: {
            id: notificationId,
          },
        })

        return res.status(200).json({ message: 'Notification marked as read' })
      } catch (error) {
        console.error('Error marking notification as read:', error)
        return res.status(500).json({ error: String(error), message: 'Internal server error' })
      }
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    console.error('Unexpected error in gift notifications API:', error)
    return res.status(500).json({ error: String(error), message: 'Internal server error' })
  }
}

export default withMethods(['GET', 'POST'], handler)
