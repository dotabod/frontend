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

    // Get the Steam account
    const steamAccount = await prisma.steamAccount.findUnique({
      where: {
        steam32Id: parsedSteam32Id,
      },
    })

    if (!steamAccount) {
      res.status(404).json({ message: 'Steam account not found' })
      return
    }

    // Check if this is the primary account for the user
    const user = await prisma.user.findUnique({
      select: {
        steam32Id: true,
      },
      where: {
        id: session.user.id,
      },
    })

    // If this is the user's primary account, check if they have other accounts
    if (user?.steam32Id === parsedSteam32Id) {
      // Find another account to make primary
      const otherAccount = await prisma.steamAccount.findFirst({
        where: {
          OR: [
            { steam32Id: { not: parsedSteam32Id }, userId: session.user.id },
            { connectedUserIds: { has: session.user.id }, steam32Id: { not: parsedSteam32Id } },
          ],
        },
      })

      if (otherAccount) {
        // Update the user's primary account
        await prisma.user.update({
          data: {
            steam32Id: otherAccount.steam32Id,
            updatedAt: new Date(),
          },
          where: {
            id: session.user.id,
          },
        })
      } else {
        // Clear the user's primary account
        await prisma.user.update({
          data: {
            steam32Id: null,
            updatedAt: new Date(),
          },
          where: {
            id: session.user.id,
          },
        })
      }
    }

    // If this is the main user for this account
    if (steamAccount.userId === session.user.id) {
      // Check if there are other connected users
      if (steamAccount.connectedUserIds && steamAccount.connectedUserIds.length > 0) {
        // Transfer ownership to the first connected user
        const newOwnerId = steamAccount.connectedUserIds[0]
        const remainingUsers = steamAccount.connectedUserIds.filter((id) => id !== newOwnerId)

        await prisma.steamAccount.update({
          data: {
            connectedUserIds: remainingUsers,
            updatedAt: new Date(),
            userId: newOwnerId,
          },
          where: {
            steam32Id: parsedSteam32Id,
          },
        })
      } else {
        // No other users, delete the account
        await prisma.steamAccount.delete({
          where: {
            steam32Id: parsedSteam32Id,
          },
        })
      }
    } else {
      // This user is in the connected users list, remove them
      await prisma.steamAccount.update({
        data: {
          connectedUserIds: {
            set: steamAccount.connectedUserIds.filter((id) => id !== session.user.id),
          },
          updatedAt: new Date(),
        },
        where: {
          steam32Id: parsedSteam32Id,
        },
      })
    }

    res.status(200).json({
      message: 'Steam account unlinked successfully',
      success: true,
    })
    return
  } catch (error) {
    captureException(error)
    console.error('Error unlinking Steam account:', error)
    res.status(500).json({ message: 'Internal server error' })
    return
  }
}

export default withMethods(['POST'], handler)
