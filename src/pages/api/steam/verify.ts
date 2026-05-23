import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

const steamVerifySchema = z.object({
  name: z.string().optional(),
  steam32Id: z.string().transform((val) => Number.parseInt(val, 10)),
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
            data: {
              connectedUserIds: {
                push: session.user.id,
              },
              updatedAt: new Date(),
            },
            where: {
              steam32Id: body.steam32Id,
            },
          })
        }

        return res.status(200).json({
          existingAccount: true,
          message: 'Steam account already linked to your profile',
          steam32Id: body.steam32Id,
        })
      }

      // Create a new steam account entry
      const steamAccount = await prisma.steamAccount.create({
        data: {
          name: body.name,
          steam32Id: body.steam32Id,
          userId: session.user.id,
        },
      })

      // Update the user record with the steam32Id
      await prisma.user.update({
        data: {
          steam32Id: body.steam32Id,
          updatedAt: new Date(),
        },
        where: {
          id: session.user.id,
        },
      })

      return res.status(200).json({
        existingAccount: false,
        message: 'Steam account linked successfully',
        steamAccount,
      })
    } catch (error) {
      captureException(error)
      console.error('Error saving Steam ID:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors, message: 'Invalid request data' })
      }

      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}

export default withMethods(['POST'], handler)
