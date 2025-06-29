import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import prisma from '@/lib/db'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(500).end()
  }

  try {
    prisma.user
      .findFirst({
        select: {
          stream_online: true,
        },
        where: {
          name: 'dotabod',
        },
      })
      .then((data) => {
        return res.json(data?.stream_online || false)
      })
      .catch((e) => {
        captureException(e)
        return res.status(500).end()
      })
  } catch (error) {
    captureException(error)
    return res.status(500).end()
  }
}

export default withMethods(['GET'], handler)
