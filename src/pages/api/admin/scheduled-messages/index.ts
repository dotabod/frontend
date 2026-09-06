import type { NextApiRequest, NextApiResponse } from 'next'

import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.role?.includes('admin')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (req.method === 'GET') {
    const scheduledMessages = await prisma.scheduledMessage.findMany({
      include: {
        deliveries: true,
        user: {
          select: {
            email: true,
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    // Get total user count for percentage calculations
    const totalUsers = await prisma.user.count()

    // Deliveries are already loaded via `include` above; count in-memory instead
    // of issuing one groupBy per message (N+1 against connection_limit).
    const messagesWithStats = scheduledMessages.map((message) => {
      const stats = {
        cancelled: 0,
        delivered: 0,
        pending: 0,
      }

      for (const delivery of message.deliveries) {
        const key = delivery.status as keyof typeof stats
        if (key in stats) {
          stats[key] += 1
        }
      }

      const targetUserCount = message.isForAllUsers ? totalUsers : 1

      return {
        ...message,
        deliveryStats: {
          ...stats,
          cancelledPercent: Math.round((stats.cancelled / targetUserCount) * 100),
          deliveredPercent: Math.round((stats.delivered / targetUserCount) * 100),
          pendingPercent: Math.round((stats.pending / targetUserCount) * 100),
          totalTargetUsers: targetUserCount,
        },
      }
    })

    res.status(200).json(messagesWithStats)
    return
  }

  if (req.method === 'POST') {
    const { message, sendAt, userId, isForAllUsers } = req.body

    if (!message || !sendAt) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    if (!isForAllUsers && !userId) {
      res.status(400).json({ error: 'Either userId or isForAllUsers must be provided' })
      return
    }

    // If we have a userId and it's not for all users, we need to find the actual user ID
    // From the accounts table using the provider account ID
    let actualUserId: string | null = null
    if (!isForAllUsers && userId) {
      try {
        // Find the user associated with this provider account ID (from Twitch)
        const account = await prisma.account.findFirst({
          select: {
            userId: true,
          },
          where: {
            providerAccountId: userId,
          },
        })

        if (!account) {
          res.status(404).json({ error: 'User not found with the provided account ID' })
          return
        }

        actualUserId = account.userId
      } catch (error) {
        console.error('Error finding user by provider account ID:', error)
        res.status(500).json({ error: 'Failed to process user ID' })
        return
      }
    }

    // When creating the scheduled message, ensure proper date handling
    try {
      const createdMessage = await prisma.scheduledMessage.create({
        data: {
          isForAllUsers,
          message,
          sendAt: new Date(sendAt),
          userId: actualUserId,
        },
      })

      res.status(200).json(createdMessage)
      return
    } catch (error) {
      console.error('Error creating scheduled message:', error)
      res.status(500).json({ error: 'Failed to create scheduled message' })
      return
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
