import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { canAccessFeature, getSubscription } from '@/utils/subscription'

async function getApprovedModerators(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  if (session?.user?.isImpersonating) {
    res.status(403).json({ message: 'Unauthorized' })
    return
  }

  const subscription = await getSubscription(session.user.id)
  const tierAccess = canAccessFeature('managers', subscription)

  if (!tierAccess.hasAccess) {
    res.status(403).json({
      error: true,
      message: 'This feature requires Pro subscription',
    })
    return
  }

  try {
    const moderators = await prisma.approvedModerator.findMany({
      select: {
        createdAt: true,
        moderatorChannelId: true,
      },
      where: {
        userId: {
          equals: session.user.id,
        },
      },
    })
    res.status(200).json(moderators)
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch approved moderators: ${error.message}` })
  }
}

export default withAuthentication(getApprovedModerators)
