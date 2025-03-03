import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  // Check if user is authenticated and has admin role
  if (!session?.user?.id || !session.user.role || !session.user.role.includes('admin')) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  // Handle GET request - retrieve scheduled messages
  if (req.method === 'GET') {
    try {
      const messages = await prisma.scheduledMessage.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      })

      return res.status(200).json(messages)
    } catch (error) {
      console.error('Error fetching scheduled messages:', error)
      captureException(error)
      return res.status(500).json({ message: 'Failed to fetch scheduled messages' })
    }
  }

  // Handle POST request - create a new scheduled message
  if (req.method === 'POST') {
    const { message, scheduledAt } = req.body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' })
    }

    try {
      // If scheduledAt is null, send the message immediately
      if (!scheduledAt) {
        // Create a record of the sent message
        const scheduledMessage = await prisma.scheduledMessage.create({
          data: {
            message,
            status: 'PENDING',
            sentAt: new Date(),
            userId: session.user.id,
          },
        })

        return res.status(200).json({
          message: 'Message scheduled successfully',
          scheduledMessage,
        })
      }

      // Otherwise, schedule the message for later
      const scheduledMessage = await prisma.scheduledMessage.create({
        data: {
          message,
          scheduledAt: new Date(scheduledAt),
          userId: session.user.id,
        },
      })

      return res.status(200).json({
        message: 'Message scheduled successfully',
        scheduledMessage,
      })
    } catch (error) {
      console.error('Error scheduling message:', error)
      captureException(error)
      return res.status(500).json({ message: 'Failed to schedule message' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}

export default withMethods(['GET', 'POST'], withAuthentication(handler))
