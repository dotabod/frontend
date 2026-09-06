import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  try {
    const { steam32Id } = req.body

    if (!steam32Id) {
      res.status(400).json({ message: 'Steam32 ID is required' })
      return
    }

    // Parse steam32Id as a number
    const parsedSteam32Id = Number.parseInt(steam32Id, 10)
    if (Number.isNaN(parsedSteam32Id)) {
      res.status(400).json({ message: 'Invalid Steam32 ID format' })
      return
    }

    // Verify that this account is linked to the user
    const steamAccount = await prisma.steamAccount.findFirst({
      where: {
        OR: [{ userId: session.user.id }, { connectedUserIds: { has: session.user.id } }],
        steam32Id: parsedSteam32Id,
      },
    })

    if (!steamAccount) {
      res.status(404).json({ message: 'Steam account not found or not linked to this user' })
      return
    }

    // Update the user record to set this account as primary
    await prisma.user.update({
      data: {
        steam32Id: parsedSteam32Id,
        updatedAt: new Date(),
      },
      where: {
        id: session.user.id,
      },
    })

    res.status(200).json({
      message: 'Primary Steam account updated successfully',
      steam32Id: parsedSteam32Id.toString(),
      success: true,
    })
    return
  } catch (error) {
    captureException(error)
    console.error('Error setting primary Steam account:', error)
    res.status(500).json({ message: 'Internal server error' })
    return
  }
}

export default withMethods(['POST'], handler)
