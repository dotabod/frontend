import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import prisma from '@/lib/db'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'

// Schema for validating the request body
const giftAlertSchema = z.object({
  notificationId: z.string(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    const userId = (req.query.id as string) || session?.user?.id || (req.query.token as string)

    if (!userId) {
      return res.status(400).json({ error: 'User is required' })
    }

    // For GET requests, retrieve the latest unread gift notification
    if (req.method === 'GET') {
      const latestNotification = await prisma.notification.findFirst({
        where: {
          userId,
          type: 'GIFT_SUBSCRIPTION',
          isRead: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          giftSubscription: true,
        },
      })

      if (!latestNotification) {
        return res.status(200).json({ hasNotification: false })
      }

      return res.status(200).json({
        hasNotification: true,
        notification: {
          id: latestNotification.id,
          senderName: latestNotification.giftSubscription?.senderName || 'Anonymous',
          giftType: latestNotification.giftSubscription?.giftType || 'monthly',
          giftQuantity: latestNotification.giftSubscription?.giftQuantity || 1,
          giftMessage: latestNotification.giftSubscription?.giftMessage || '',
          createdAt: latestNotification.createdAt,
        },
      })
    }

    // For POST requests, mark a notification as read
    if (req.method === 'POST') {
      const { notificationId } = giftAlertSchema.parse(req.body)

      // Verify the notification belongs to the user
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
        },
      })

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' })
      }

      // Mark the notification as read
      await prisma.notification.update({
        where: {
          id: notificationId,
        },
        data: {
          isRead: true,
        },
      })

      return res.status(200).json({ success: true })
    }
  } catch (error) {
    console.error('Error in gift-alert API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withMethods(['GET', 'POST'], withAuthentication(handler))
