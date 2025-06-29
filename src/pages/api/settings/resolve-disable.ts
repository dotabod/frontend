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
      const { settingKey, autoResolved = false } = req.body

      if (!settingKey) {
        return res.status(400).json({ message: 'Setting key is required' })
      }

      const now = new Date()

      await prisma.$transaction(async (tx) => {
        // Clear disable reason from setting
        await tx.setting.updateMany({
          where: {
            userId: session.user.id,
            key: settingKey,
          },
          data: {
            disableReason: null,
            autoDisabledAt: null,
            autoDisabledBy: null,
            disableMetadata: undefined,
            updatedAt: now,
          },
        })

        // Mark notifications as resolved
        await tx.disableNotification.updateMany({
          where: {
            userId: session.user.id,
            settingKey,
            resolvedAt: null,
          },
          data: {
            resolvedAt: now,
            autoResolved,
          },
        })
      })

      return res.status(200).json({ message: 'Disable reason resolved successfully' })
    } catch (error) {
      captureException(error)
      return res.status(500).json({
        message: 'Failed to resolve disable reason',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' })
}

export default withMethods(['POST'], withAuthentication(handler))
