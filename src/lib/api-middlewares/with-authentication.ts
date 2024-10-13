import { getServerSession } from '@/lib/api/getServerSession'
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'

import { authOptions } from '@/lib/auth'

export function withAuthentication(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions)
    const userId =
      (req.query.id as string) ||
      session?.user?.id ||
      (req.query.token as string)
    const username = req.query.username as string

    if (!userId && !username) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    return handler(req, res)
  }
}
