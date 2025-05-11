import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Find the user's primary linked Steam account
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        steam32Id: true,
      },
    })

    const primarySteam32Id = user?.steam32Id

    // Get all Steam accounts linked to this user
    // This includes both primary and secondary accounts
    const steamAccounts = await prisma.steamAccount.findMany({
      where: {
        OR: [{ userId: session.user.id }, { connectedUserIds: { has: session.user.id } }],
      },
      select: {
        steam32Id: true,
        name: true,
        userId: true,
      },
    })

    if (!steamAccounts || steamAccounts.length === 0) {
      return res.status(200).json({ linked: false })
    }

    // Format the accounts data
    const linkedAccounts = steamAccounts.map((account) => ({
      steam32Id: account.steam32Id.toString(),
      name: account.name,
      isPrimary: account.steam32Id === primarySteam32Id,
    }))

    return res.status(200).json({
      linked: true,
      accounts: linkedAccounts,
      primaryAccount: primarySteam32Id
        ? {
            steam32Id: primarySteam32Id.toString(),
            profileData: {
              name: steamAccounts.find((a) => a.steam32Id === primarySteam32Id)?.name || 'Unknown',
              id: primarySteam32Id.toString(),
            },
          }
        : null,
    })
  } catch (error) {
    captureException(error)
    console.error('Error fetching linked Steam accounts:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default withMethods(['GET'], handler)
