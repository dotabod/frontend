import { getServerSession } from '@/lib/api/getServerSession'
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'

import { authOptions } from '@/lib/auth'
import * as Sentry from '@sentry/nextjs'

export function withAuthentication(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions)
    const userId =
      (req.query.id as string) ||
      session?.user?.id ||
      (req.query.token as string)
    const username = req.query.username as string

    if (process.env.NEXT_PUBLIC_SENTRY_DSN && !!session?.user?.id) {
      Sentry.setUser({
        id: session?.user?.id,
        username: session?.user?.name,
        email: session?.user?.email,
        twitchId: session?.user?.twitchId,
        locale: session?.user?.locale,
        isImpersonating: session?.user?.isImpersonating,
      })
    }

    if (!userId && !username) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    return handler(req, res)
  }
}
