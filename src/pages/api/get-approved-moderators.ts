import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import type { NextApiRequest, NextApiResponse } from 'next'

async function getApprovedModerators(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Unauthorized' })
  }

  try {
    const moderators = await prisma.approvedModerator.findMany({
      select: {
        moderatorChannelId: true,
        createdAt: true,
      },
      where: {
        userId: {
          equals: session.user.id,
        },
      },
    })
    res.status(200).json(moderators)
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to fetch approved moderators: ${error.message}` })
  }
}

export default withAuthentication(getApprovedModerators)
