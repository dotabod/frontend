import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
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
  if (!session?.user?.id) return res.status(403).json({ message: 'Unauthorized' })

  const rows = await prisma.setting.findMany({
    select: { key: true, updatedAt: true },
    where: { key: { in: diagnosticKeys }, userId: session.user.id },
  })
  const timestamps = new Map(rows.map((row) => [row.key, row.updatedAt.toISOString()]))

  return res.json({
    gsiLastSeenAt: timestamps.get(SETUP_SIGNAL_KEYS.gsiLastSeen) ?? null,
    overlayPageLastSeenAt: timestamps.get(SETUP_SIGNAL_KEYS.overlayPageLastSeen) ?? null,
    overlaySocketLastSeenAt: timestamps.get(SETUP_SIGNAL_KEYS.overlaySocketLastSeen) ?? null,
  })
}

export default withMethods(['GET'], handler)
