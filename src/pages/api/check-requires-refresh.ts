import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

const handler = async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const account = await prisma.account.findFirst({
      select: {
        requires_refresh: true,
      },
      where: {
        userId: session.user.id,
      },
    })

    // Twitch revokes the token when the streamer changes their password, enables 2FA, or
    // removes app access. Until they sign in again, the backend drops their GSI and the bot
    // can't post, even if Dotabod is toggled on. useMaybeSignout sends them to re-link.
    const requiresRefresh = !account || account.requires_refresh === true

    res.status(200).json(requiresRefresh)
    return
  } catch (error) {
    captureException(error)
    res.status(500).json({ error: error.message, message: 'Failed to get info' })
    return
  }
}

export default withMethods(['GET'], withAuthentication(handler))
