import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user || !session.user.role.includes('admin')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const scheduledMessages = await prisma.scheduledMessage.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        deliveries: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get total user count for percentage calculations
    const totalUsers = await prisma.user.count()

    const messagesWithStats = await Promise.all(
      scheduledMessages.map(async (message) => {
        const deliveryStats = await prisma.messageDelivery.groupBy({
          by: ['status'],
          where: {
            scheduledMessageId: message.id,
          },
          _count: {
            status: true,
          },
        })

        const stats = {
          delivered: 0,
          pending: 0,
          cancelled: 0,
        }

        for (const stat of deliveryStats) {
          stats[stat.status as keyof typeof stats] = Number(stat._count.status)
        }

        const targetUserCount = message.isForAllUsers ? totalUsers : 1

        return {
          ...message,
          deliveryStats: {
            ...stats,
            totalTargetUsers: targetUserCount,
            deliveredPercent: Math.round((stats.delivered / targetUserCount) * 100),
            pendingPercent: Math.round((stats.pending / targetUserCount) * 100),
            cancelledPercent: Math.round((stats.cancelled / targetUserCount) * 100),
          },
        }
      }),
    )

    return res.status(200).json(messagesWithStats)
  }

  if (req.method === 'POST') {
    const { message, sendAt, userId, isForAllUsers, scheduledAt } = req.body

    if (!message || !sendAt) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (!isForAllUsers && !userId) {
      return res.status(400).json({ error: 'Either userId or isForAllUsers must be provided' })
    }

    // If we have a userId and it's not for all users, we need to find the actual user ID
    // from the accounts table using the provider account ID
    let actualUserId: string | null = null
    if (!isForAllUsers && userId) {
      try {
        // Find the user associated with this provider account ID (from Twitch)
        const account = await prisma.account.findFirst({
          where: {
            providerAccountId: userId,
          },
          select: {
            userId: true,
          },
        })

        if (!account) {
          return res.status(404).json({ error: 'User not found with the provided account ID' })
        }

        actualUserId = account.userId
      } catch (error) {
        console.error('Error finding user by provider account ID:', error)
        return res.status(500).json({ error: 'Failed to process user ID' })
      }
    }

    // When creating the scheduled message, ensure proper date handling
    try {
      const createdMessage = await prisma.scheduledMessage.create({
        data: {
          message,
          userId: actualUserId,
          isForAllUsers,
          sendAt: new Date(sendAt),
        },
      })

      return res.status(200).json(createdMessage)
    } catch (error) {
      console.error('Error creating scheduled message:', error)
      return res.status(500).json({ error: 'Failed to create scheduled message' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
