import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method Not Allowed' })
    return
  }

  const session = await getServerSession(req, res, authOptions)
  if (session?.user?.isImpersonating) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }
  if (!session?.user?.id) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  try {
    const response = await prisma.account.findFirst({
      select: {
        requires_refresh: true,
        user: {
          select: {
            displayName: true,
            name: true,
          },
        },
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

    res.status(200).json(requiresRefresh)
    return
  } catch (error) {
    captureException(error)
    res.status(500).json({ error: error.message, message: 'Failed to get info' })
    return
  }
}

export default withMethods(['GET'], withAuthentication(handler))
