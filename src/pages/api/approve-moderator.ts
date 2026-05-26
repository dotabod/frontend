import type { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { canAccessFeature, getSubscription } from '@/utils/subscription'

const approvedModeratorSchema = z.array(z.number())

async function approveModerators(userId: string, newModeratorChannelIds: number[]) {
  try {
    // Fetch the current list of approved moderator channel IDs
    const currentModerators = await prisma.approvedModerator.findMany({
      select: { moderatorChannelId: true },
      where: { userId },
    })
    const currentModeratorChannelIds = currentModerators.map((mod) => mod.moderatorChannelId)

    // Determine which moderators to add and which to remove
    const moderatorsToAdd = newModeratorChannelIds.filter(
      (id) => !currentModeratorChannelIds.includes(id),
    )
    const moderatorsToRemove = currentModeratorChannelIds.filter(
      (id) => !newModeratorChannelIds.includes(id),
    )

    await prisma.$transaction(async (tx) => {
      if (moderatorsToRemove.length > 0) {
        await tx.approvedModerator.deleteMany({
          where: {
            moderatorChannelId: { in: moderatorsToRemove },
            userId,
          },
        })
      }

      if (moderatorsToAdd.length > 0) {
        await tx.approvedModerator.createMany({
          data: moderatorsToAdd.map((moderatorChannelId) => ({
            moderatorChannelId,
            userId,
          })),
        })
      }
    })
  } catch (error) {
    throw new Error(`Failed to approve managers: ${error.message}`, { cause: error })
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const subscription = await getSubscription(session.user.id)
  const tierAccess = canAccessFeature('managers', subscription)

  if (!tierAccess.hasAccess) {
    return res.status(403).json({
      error: true,
      message: 'This feature requires Pro subscription',
    })
  }

  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Unauthorized' })
  }

  if (method === 'POST') {
    const { moderatorChannelIds } = req.body

    if (!Array.isArray(moderatorChannelIds)) {
      return res.status(400).json({ message: 'moderatorChannelIds must be an array' })
    }

    const parsedModeratorChannelIds = moderatorChannelIds.map((id) => Number.parseInt(id, 10))

    const parseResult = approvedModeratorSchema.safeParse(parsedModeratorChannelIds)
    if (!parseResult.success) {
      return res.status(400).json({
        errors: parseResult.error.errors,
        message: 'Invalid moderatorChannelIds',
      })
    }

    try {
      await approveModerators(session?.user?.id, parsedModeratorChannelIds)
      return res.status(200).json({ message: 'Managers approved successfully' })
    } catch (error) {
      console.error('Failed to approve managers:', error)
      return res.status(500).json({ error, message: 'Error approving managers' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${method} Not Allowed`)
  }
}

export default withAuthentication(withMethods(['POST'], handler))
