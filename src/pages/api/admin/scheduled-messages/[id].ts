import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const { id } = req.query

  // Check if user is authenticated and has admin role
  if (!session?.user?.id || !session.user.role || !session.user.role.includes('admin')) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  // Handle DELETE request - delete a scheduled message
  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid message ID' })
    }

    try {
      // Check if the message exists and is still pending
      const message = await prisma.scheduledMessage.findUnique({
        where: { id },
      })

      if (!message) {
        return res.status(404).json({ message: 'Message not found' })
      }

      if (message.status !== 'PENDING') {
        return res.status(400).json({
          message: 'Cannot delete a message that has already been sent or failed',
        })
      }

      // Delete the message
      await prisma.scheduledMessage.delete({
        where: { id },
      })

      return res.status(200).json({ message: 'Message deleted successfully' })
    } catch (error) {
      console.error('Error deleting scheduled message:', error)
      captureException(error)
      return res.status(500).json({ message: 'Failed to delete message' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}

export default withMethods(['DELETE'], withAuthentication(handler))
