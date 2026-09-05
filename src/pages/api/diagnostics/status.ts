import type { NextApiRequest, NextApiResponse } from 'next'

import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { SETUP_SIGNAL_KEYS } from '@/lib/setupSignalKeys'

const diagnosticKeys = [
  SETUP_SIGNAL_KEYS.gsiLastSeen,
  SETUP_SIGNAL_KEYS.overlayPageLastSeen,
  SETUP_SIGNAL_KEYS.overlaySocketLastSeen,
]

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    res.status(403).json({ message: 'Unauthorized' })
    return
  }

  const rows = await prisma.setting.findMany({
    select: { key: true, updatedAt: true },
    where: { key: { in: diagnosticKeys }, userId: session.user.id },
  })
  const timestamps = new Map(rows.map((row) => [row.key, row.updatedAt.toISOString()]))

  res.json({
    gsiLastSeenAt: timestamps.get(SETUP_SIGNAL_KEYS.gsiLastSeen) ?? null,
    overlayPageLastSeenAt: timestamps.get(SETUP_SIGNAL_KEYS.overlayPageLastSeen) ?? null,
    overlaySocketLastSeenAt: timestamps.get(SETUP_SIGNAL_KEYS.overlaySocketLastSeen) ?? null,
  })
}

export default withMethods(['GET'], handler)
