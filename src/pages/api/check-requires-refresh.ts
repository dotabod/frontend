import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  try {
    const response = await prisma.account.findFirst({
      select: {
        user: {
          select: {
            name: true,
            displayName: true,
          },
        },
        requires_refresh: true,
      },
      where: {
        userId: session.user.id,
      },
    })

    let requiresRefresh = false

    if (!response) {
      requiresRefresh = true
    }
    if (response?.requires_refresh) {
      requiresRefresh = true
    }

    if (session?.user?.name !== response?.user?.displayName) {
      requiresRefresh = true
    }

    // For now, always return no refresh
    // TODO: Remove this once we have a way to check if the user has the correct scopes
    requiresRefresh = false

    return res.status(200).json(requiresRefresh)
  } catch (error) {
    captureException(error)
    return res.status(500).json({ message: 'Failed to get info', error: error.message })
  }
}

export default withMethods(['GET'], withAuthentication(handler))
