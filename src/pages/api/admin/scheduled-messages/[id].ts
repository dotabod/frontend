import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user || !session.user.role?.includes('admin')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' })
  }

  // GET a single scheduled message with delivery stats
  if (req.method === 'GET') {
    const scheduledMessage = await prisma.scheduledMessage.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!scheduledMessage) {
      return res.status(404).json({ error: 'Scheduled message not found' })
    }

    // Get delivery stats
    const deliveryStats = await prisma.messageDelivery.groupBy({
      by: ['status'],
      where: {
        scheduledMessageId: id,
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

    // Get total user count for percentage calculations
    const totalUsers = await prisma.user.count()
    const targetUserCount = scheduledMessage.isForAllUsers ? totalUsers : 1

    return res.status(200).json({
      ...scheduledMessage,
      deliveryStats: {
        ...stats,
        totalTargetUsers: targetUserCount,
        deliveredPercent: Math.round((stats.delivered / targetUserCount) * 100),
        pendingPercent: Math.round((stats.pending / targetUserCount) * 100),
        cancelledPercent: Math.round((stats.cancelled / targetUserCount) * 100),
      },
    })
  }

  // UPDATE a scheduled message
  if (req.method === 'PUT') {
    const { message, sendAt, userId, isForAllUsers } = req.body

    if (!message && !sendAt && userId === undefined && isForAllUsers === undefined) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const existingMessage = await prisma.scheduledMessage.findUnique({
      where: { id },
    })

    if (!existingMessage) {
      return res.status(404).json({ error: 'Scheduled message not found' })
    }

    // Don't allow editing messages that have already been sent
    if (existingMessage.status === 'DELIVERED') {
      return res.status(400).json({ error: 'Cannot edit a message that has already been sent' })
    }

    const updateData: Record<string, any> = {}
    if (message) updateData.message = message
    if (sendAt) updateData.sendAt = new Date(sendAt)

    // Handle the isForAllUsers and userId logic
    if (isForAllUsers !== undefined) {
      updateData.isForAllUsers = isForAllUsers
      if (isForAllUsers) {
        updateData.userId = null
      } else if (userId) {
        updateData.userId = userId
      }
    } else if (userId !== undefined) {
      updateData.userId = userId
      updateData.isForAllUsers = false
    }

    updateData.updatedAt = new Date()

    const updatedMessage = await prisma.scheduledMessage.update({
      where: { id },
      data: updateData,
    })

    return res.status(200).json(updatedMessage)
  }

  // DELETE a scheduled message
  if (req.method === 'DELETE') {
    const existingMessage = await prisma.scheduledMessage.findUnique({
      where: { id },
    })

    if (!existingMessage) {
      return res.status(404).json({ error: 'Scheduled message not found' })
    }

    // If the message is pending, we can delete it completely
    if (existingMessage.status === 'PENDING') {
      await prisma.scheduledMessage.delete({
        where: { id },
      })
    } else {
      // If the message is already being processed, mark it as cancelled
      await prisma.scheduledMessage.update({
        where: { id },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      })

      // Also mark all pending deliveries as cancelled
      await prisma.messageDelivery.updateMany({
        where: {
          scheduledMessageId: id,
          status: 'PENDING',
        },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      })
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
