import { NextApiRequest, NextApiResponse } from 'next'

import prisma from '@/lib/db'
import { withMethods } from '@/lib/api-middlewares/with-methods'

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
        return res.status(500).end()
      })
  } catch (error) {
    return res.status(500).end()
  }
}

export default withMethods(['GET'], handler)
