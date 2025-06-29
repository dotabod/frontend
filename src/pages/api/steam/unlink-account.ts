import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

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

    // Get the Steam account
    const steamAccount = await prisma.steamAccount.findUnique({
      where: {
        steam32Id: parsedSteam32Id,
      },
    })

    if (!steamAccount) {
      return res.status(404).json({ message: 'Steam account not found' })
    }

    // Check if this is the primary account for the user
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        steam32Id: true,
      },
    })

    // If this is the user's primary account, check if they have other accounts
    if (user?.steam32Id === parsedSteam32Id) {
      // Find another account to make primary
      const otherAccount = await prisma.steamAccount.findFirst({
        where: {
          OR: [
            { userId: session.user.id, steam32Id: { not: parsedSteam32Id } },
            { connectedUserIds: { has: session.user.id }, steam32Id: { not: parsedSteam32Id } },
          ],
        },
      })

      if (otherAccount) {
        // Update the user's primary account
        await prisma.user.update({
          where: {
            id: session.user.id,
          },
          data: {
            steam32Id: otherAccount.steam32Id,
            updatedAt: new Date(),
          },
        })
      } else {
        // Clear the user's primary account
        await prisma.user.update({
          where: {
            id: session.user.id,
          },
          data: {
            steam32Id: null,
            updatedAt: new Date(),
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
          where: {
            steam32Id: parsedSteam32Id,
          },
          data: {
            userId: newOwnerId,
            connectedUserIds: remainingUsers,
            updatedAt: new Date(),
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
        where: {
          steam32Id: parsedSteam32Id,
        },
        data: {
          connectedUserIds: {
            set: steamAccount.connectedUserIds.filter((id) => id !== session.user.id),
          },
          updatedAt: new Date(),
        },
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Steam account unlinked successfully',
    })
  } catch (error) {
    captureException(error)
    console.error('Error unlinking Steam account:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default withMethods(['POST'], handler)
