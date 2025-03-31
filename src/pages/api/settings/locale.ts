import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { localePatchSchema } from '@/lib/validations/setting'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(500).end()
  }

  if (req.method === 'GET') {
    // Caught error
    const locale = await prisma.user.findFirst({
      where: {
        id: session.user.id,
      },
      select: {
        locale: true,
      },
    })

    return res.json(locale)
  }

  if (req.method === 'PATCH') {
    const body = localePatchSchema.parse(JSON.parse(req.body))

    await prisma.user.update({
      data: {
        locale: body,
        updatedAt: new Date(),
      },
      where: {
        id: session.user.id,
      },
    })

    return res.status(200).json({ status: 'ok' })
  }

  return res.status(500).end()
}

export default withMethods(['PATCH', 'GET'], withAuthentication(handler))
