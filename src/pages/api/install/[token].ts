import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { buildGsiConfig } from '@/lib/gsi-config'
import { canAccessFeature, getSubscription } from '@/utils/subscription'

const handler = async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const token = decodeURIComponent((req.query.token as string) || '').trim()
  const userId = token || session?.user?.id

  if (session?.user?.isImpersonating) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }
  if (!userId) {
    res.status(403).json({ message: 'Unauthorized' })
    return
  }

  // Check subscription access
  const subscription = await getSubscription(userId)
  const { hasAccess, requiredTier } = canAccessFeature('autoInstaller', subscription)

  if (!hasAccess) {
    res.status(403).json({ error: 'This feature requires a subscription', requiredTier })
    return
  }

  try {
    const response = await prisma.user.findFirstOrThrow({
      select: {
        name: true,
      },
      where: {
        id: userId,
      },
    })

    const fileName = `gamestate_integration_dotabod-${response.name}.cfg`
    const fileData = buildGsiConfig(userId)

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Type', 'text/plain')
    res.status(200).send(fileData)
  } catch (error) {
    captureException(error)
    res.status(500).json({ error: error.message, message: 'Failed to get info' })
    return
  }
}

export default withMethods(['GET', 'HEAD'], withAuthentication(handler))
