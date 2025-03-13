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

    // GET: Fetch unread gift notifications
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
              createdAt: notification.createdAt,
            }
          })
          .filter(Boolean)

        return res.status(200).json({
          hasNotification: formattedNotifications.length > 0,
          notifications: formattedNotifications,
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

        // Also mark the gift subscription as viewed
        if (notification.giftSubscriptionId) {
          await prisma.giftSubscription.update({
            where: {
              id: notification.giftSubscriptionId,
            },
            data: {
              isViewed: true,
            },
          })
        }

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
