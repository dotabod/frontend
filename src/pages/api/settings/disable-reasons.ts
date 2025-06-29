import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (req.method === 'GET') {
    try {
      // Get all unresolved disable reasons for the user
      const disableReasons = await prisma.disableNotification.findMany({
        where: {
          userId: session.user.id,
          resolvedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Also get settings with disable reasons
      const disabledSettings = await prisma.setting.findMany({
        where: {
          userId: session.user.id,
          disableReason: {
            not: null,
          },
        },
        select: {
          key: true,
          disableReason: true,
          autoDisabledAt: true,
          autoDisabledBy: true,
          disableMetadata: true,
        },
      })

      return res.status(200).json({
        notifications: disableReasons,
        disabledSettings,
      })
    } catch (error) {
      captureException(error)
      return res.status(500).json({
        message: 'Failed to get disable reasons',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' })
}

export default withMethods(['GET'], withAuthentication(handler))
