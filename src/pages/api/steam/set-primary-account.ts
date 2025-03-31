import type { NextApiRequest, NextApiResponse } from 'next'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const { steam32Id } = req.body

    if (!steam32Id) {
      return res.status(400).json({ message: 'Steam32 ID is required' })
    }

    // Parse steam32Id as a number
    const parsedSteam32Id = Number.parseInt(steam32Id, 10)
    if (Number.isNaN(parsedSteam32Id)) {
      return res.status(400).json({ message: 'Invalid Steam32 ID format' })
    }

    // Verify that this account is linked to the user
    const steamAccount = await prisma.steamAccount.findFirst({
      where: {
        steam32Id: parsedSteam32Id,
        OR: [{ userId: session.user.id }, { connectedUserIds: { has: session.user.id } }],
      },
    })

    if (!steamAccount) {
      return res.status(404).json({ message: 'Steam account not found or not linked to this user' })
    }

    // Update the user record to set this account as primary
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        steam32Id: parsedSteam32Id,
        updatedAt: new Date(),
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Primary Steam account updated successfully',
      steam32Id: parsedSteam32Id.toString(),
    })
  } catch (error) {
    captureException(error)
    console.error('Error setting primary Steam account:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default withMethods(['POST'], handler)
