import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

// Single notifications endpoint for the dashboard. Returns every notification type the
// user has (gift subscriptions + new-feature heads-ups, …), each mapped to a
// type-discriminated shape consumers switch on, plus the gift `hasLifetime` aggregate.
// The bell renders all types; the gift toast in DashboardShell filters to GIFT_SUBSCRIPTION.
const markAsReadSchema = z.object({
  notificationId: z.string(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const userId = session.user.id

    if (req.method === 'GET') {
      try {
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
        const includeRead = req.query.includeRead === 'true'

        const rows = await prisma.notification.findMany({
          include: {
            giftSubscription: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          where: {
            type: { in: ['GIFT_SUBSCRIPTION', 'NEW_FEATURE'] },
            userId,
            ...(includeRead ? {} : { isRead: false }),
          },
        })

        // Gift aggregate still surfaced here (consumed by the gift toast + admin page).
        const activeSubscriptions = await prisma.subscription.findMany({
          include: {
            giftDetails: true,
          },
          where: {
            status: 'ACTIVE',
            userId,
          },
        })
        const hasLifetime = activeSubscriptions.some(
          (sub) =>
            sub.giftDetails?.giftType === 'lifetime' ||
            (sub.tier === 'PRO' && sub.transactionType === 'LIFETIME'),
        )

        const notifications = rows
          .map((n) => {
            if (n.type === 'NEW_FEATURE') {
              return {
                createdAt: n.createdAt,
                id: n.id,
                read: n.isRead,
                type: 'NEW_FEATURE' as const,
              }
            }

            // GIFT_SUBSCRIPTION — drop orphaned rows whose gift was deleted.
            if (!n.giftSubscription) {
              return null
            }

            return {
              createdAt: n.createdAt,
              giftMessage: n.giftSubscription.giftMessage,
              giftQuantity: n.giftSubscription.giftQuantity || 1,
              giftType: n.giftSubscription.giftType,
              id: n.id,
              read: n.isRead,
              senderName: n.giftSubscription.senderName,
              type: 'GIFT_SUBSCRIPTION' as const,
            }
          })
          .filter(Boolean)

        return res.status(200).json({
          hasLifetime,
          notifications,
          totalNotifications: notifications.length,
        })
      } catch (error) {
        console.error('Error fetching notifications:', error)
        return res.status(500).json({ error: String(error), message: 'Internal server error' })
      }
    }

    if (req.method === 'POST') {
      try {
        const validationResult = markAsReadSchema.safeParse(req.body)
        if (!validationResult.success) {
          return res
            .status(400)
            .json({ errors: validationResult.error.format(), message: 'Invalid request body' })
        }

        const { notificationId } = validationResult.data

        // Scope the update to the caller's own notifications.
        const notification = await prisma.notification.findFirst({
          where: {
            id: notificationId,
            userId,
          },
        })

        if (!notification) {
          return res.status(404).json({ message: 'Notification not found' })
        }

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
    console.error('Unexpected error in notifications API:', error)
    return res.status(500).json({ error: String(error), message: 'Internal server error' })
  }
}

export default withMethods(['GET', 'POST'], handler)
