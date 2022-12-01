import { NextApiRequest, NextApiResponse } from 'next'

import prisma from '@/lib/db'
import { withMethods } from '@/lib/api-middlewares/with-methods'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(500).end()
  }

  try {
    prisma.user
      .findMany({
        take: 10,
        select: {
          name: true,
          image: true,
        },
        where: {
          name: {
            in: [
              'WagamamaTV',
              'XcaliburYe',
              'Grubby',
              'Draskyl',
              'febbydoto',
              'SabeRLighT00',
              'YuHengTV',
              'FiXeRsdota2',
              'SequinoxTV',
            ],
          },
        },
      })
      .then((data) => {
        return res.json(data)
      })
      .catch((e) => {
        return res.status(500).end()
      })
  } catch (error) {
    return res.status(500).end()
  }
}

export default withMethods(['GET'], handler)
