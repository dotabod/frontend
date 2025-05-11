import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { prismaMongo } from '@/lib/db'
import { captureException } from '@sentry/nextjs'
import { detect } from 'curse-filter'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

// Define validation schema for creating a notable player
const createNotablePlayerSchema = z.object({
  name: z
    .string()
    .min(1)
    .refine((name) => !name || !detect(name), {
      message: 'Name contains inappropriate language. Please revise it.',
    }),
  account_id: z.coerce.number().int().positive({ message: 'Account ID must be a positive number' }),
  country_code: z.string().max(3).optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id || !session?.user?.twitchId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get the user's Twitch ID to use as the channel - convert to string
    const channel = `${session.user.twitchId}`

    // GET - List notable players for the user's channel
    if (req.method === 'GET') {
      const notablePlayers = await prismaMongo.notablePlayers.findMany({
        where: {
          channel,
        },
        orderBy: {
          name: 'asc',
        },
      })

      return res.status(200).json(notablePlayers)
    }

    // POST - Create a new notable player
    if (req.method === 'POST') {
      const validatedData = createNotablePlayerSchema.parse(req.body)

      // Check if player with this account_id already exists for this channel
      const existingPlayer = await prismaMongo.notablePlayers.findFirst({
        where: {
          account_id: {
            equals: validatedData.account_id,
          },
          channel,
        },
      })

      if (existingPlayer) {
        return res.status(409).json({ error: 'Player already exists' })
      }

      // Create the new notable player with type assertion for the data
      const newPlayer = await prismaMongo.notablePlayers.create({
        data: {
          ...validatedData,
          channel,
          addedBy: session.user.name,
          createdAt: new Date(),
        },
      })

      return res.status(201).json(newPlayer)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }

    console.error('Error in notable-players API:', error)
    captureException(error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withMethods(['GET', 'POST'], withAuthentication(handler))
