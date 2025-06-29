import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (req.method === 'POST') {
    try {
      const { notificationId } = req.body

      if (!notificationId) {
        return res.status(400).json({ message: 'Notification ID is required' })
      }

      // Update the notification to mark it as acknowledged
      const result = await prisma.disableNotification.updateMany({
        where: {
          id: notificationId,
          userId: session.user.id,
        },
        data: {
          acknowledged: true,
        },
      })

      if (result.count === 0) {
        return res.status(404).json({ message: 'Notification not found' })
      }

      return res.status(200).json({ message: 'Notification acknowledged successfully' })
    } catch (error) {
      captureException(error)
      return res.status(500).json({
        message: 'Failed to acknowledge disable reason',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' })
}

export default withMethods(['POST'], withAuthentication(handler))
