import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import type { NextApiRequest, NextApiResponse } from 'next'
async function approveModerator(
  userId: string,
  moderatorChannelId: string,
  isModeratorApproved: boolean
) {
  try {
    if (isModeratorApproved) {
      // Delete the moderator's approval record from the database
      await prisma.approvedModerator.deleteMany({
        where: {
          userId,
          moderatorChannelId,
        },
      })
    } else {
      // Create a new approval record in the database
      await prisma.approvedModerator.create({
        data: {
          userId,
          moderatorChannelId,
        },
      })
    }
  } catch (error) {
    throw new Error(`Failed to approve moderator: ${error.message}`)
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Unauthorized' })
  }

  if (method === 'POST') {
    const { moderatorChannelId, isModeratorApproved } = req.body

    if (!moderatorChannelId) {
      return res.status(400).json({ message: 'Missing moderatorChannelId' })
    }

    try {
      await approveModerator(
        session?.user?.id,
        moderatorChannelId,
        isModeratorApproved
      )
      return res
        .status(200)
        .json({ message: 'Moderator approved successfully' })
    } catch (error) {
      console.error('Failed to approve moderator:', error)
      return res
        .status(500)
        .json({ message: 'Error approving moderator', error })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${method} Not Allowed`)
  }
}

export default withAuthentication(withMethods(['POST'], handler))
