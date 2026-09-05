import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  if (req.method === 'POST') {
    try {
      const { notificationId } = req.body

      if (!notificationId) {
        res.status(400).json({ message: 'Notification ID is required' })
        return
      }

      // Update the notification to mark it as acknowledged
      const result = await prisma.disableNotification.updateMany({
        data: {
          acknowledged: true,
        },
        where: {
          id: notificationId,
          userId: session.user.id,
        },
      })

      if (result.count === 0) {
        res.status(404).json({ message: 'Notification not found' })
        return
      }

      res.status(200).json({ message: 'Notification acknowledged successfully' })
      return
    } catch (error) {
      captureException(error)
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to acknowledge disable reason',
      })
      return
    }
  }

  res.status(405).json({ message: 'Method Not Allowed' })
}

export default withMethods(['POST'], withAuthentication(handler))
