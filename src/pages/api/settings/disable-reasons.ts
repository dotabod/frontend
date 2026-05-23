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

  if (req.method === 'GET') {
    try {
      // Get all unresolved disable reasons for the user
      const disableReasons = await prisma.disableNotification.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        where: {
          resolvedAt: null,
          userId: session.user.id,
        },
      })

      // Also get settings with disable reasons
      const disabledSettings = await prisma.setting.findMany({
        select: {
          autoDisabledAt: true,
          autoDisabledBy: true,
          disableMetadata: true,
          disableReason: true,
          key: true,
        },
        where: {
          disableReason: {
            not: null,
          },
          userId: session.user.id,
        },
      })

      return res.status(200).json({
        disabledSettings,
        notifications: disableReasons,
      })
    } catch (error) {
      captureException(error)
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get disable reasons',
      })
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' })
}

export default withMethods(['GET'], withAuthentication(handler))
