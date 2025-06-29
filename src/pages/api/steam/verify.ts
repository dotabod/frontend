import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

const steamVerifySchema = z.object({
  steam32Id: z.string().transform((val) => Number.parseInt(val, 10)),
  name: z.string().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (req.method === 'POST') {
    try {
      const body = steamVerifySchema.parse(req.body)

      // Check if a SteamAccount with this steam32Id already exists
      const existingSteamAccount = await prisma.steamAccount.findUnique({
        where: {
          steam32Id: body.steam32Id,
        },
      })

      if (existingSteamAccount) {
        // If it exists but belongs to a different user, link it to the current user as well
        if (existingSteamAccount.userId !== session.user.id) {
          await prisma.steamAccount.update({
            where: {
              steam32Id: body.steam32Id,
            },
            data: {
              connectedUserIds: {
                push: session.user.id,
              },
              updatedAt: new Date(),
            },
          })
        }

        return res.status(200).json({
          message: 'Steam account already linked to your profile',
          existingAccount: true,
          steam32Id: body.steam32Id,
        })
      }

      // Create a new steam account entry
      const steamAccount = await prisma.steamAccount.create({
        data: {
          steam32Id: body.steam32Id,
          name: body.name,
          userId: session.user.id,
        },
      })

      // Update the user record with the steam32Id
      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          steam32Id: body.steam32Id,
          updatedAt: new Date(),
        },
      })

      return res.status(200).json({
        message: 'Steam account linked successfully',
        existingAccount: false,
        steamAccount,
      })
    } catch (error) {
      captureException(error)
      console.error('Error saving Steam ID:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors })
      }

      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}

export default withMethods(['POST'], handler)
