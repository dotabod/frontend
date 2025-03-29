import type { NextApiRequest, NextApiResponse } from 'next'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Find the user's linked Steam account
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        steam32Id: true,
      },
    })

    if (!user?.steam32Id) {
      return res.status(200).json({ linked: false })
    }

    // Get the Steam account details
    const steamAccount = await prisma.steamAccount.findUnique({
      where: {
        steam32Id: user.steam32Id,
      },
      select: {
        steam32Id: true,
        name: true,
      },
    })

    if (!steamAccount) {
      return res.status(200).json({ linked: false })
    }

    return res.status(200).json({
      linked: true,
      steam32Id: steamAccount.steam32Id.toString(),
      profileData: {
        name: steamAccount.name,
        id: steamAccount.steam32Id.toString(),
      },
    })
  } catch (error) {
    captureException(error)
    console.error('Error fetching linked Steam account:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default withMethods(['GET'], handler)
