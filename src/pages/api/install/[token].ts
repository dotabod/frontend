import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const token = decodeURIComponent((req.query.token as string) || '').trim()
  const userId = token || session?.user?.id
  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  if (!userId) {
    return res.status(403).json({ message: 'Unauthorized' })
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
    const fileData = `"Dotabod Configuration"
{
  "uri" "${process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL}"
  "timeout" "5.0"
  "buffer" "0.5"
  "throttle" "0.5"
  "heartbeat" "30.0"
  "data"
  {
    "abilities" "1"
    "buildings" "1"
    "events" "1"
    "hero" "1"
    "items" "1"
    "map" "1"
    "player" "1"
    "provider" "1"
    "wearables" "1"
  }
  "auth"
  {
    "token" "${userId}"
  }
}
`

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Type', 'text/plain')
    res.status(200).send(fileData)
  } catch (error) {
    captureException(error)
    return res
      .status(500)
      .json({ message: 'Failed to get info', error: error.message })
  }
}

export default withMethods(['GET', 'HEAD'], withAuthentication(handler))
