import { captureException } from '@sentry/nextjs'
import { detect } from 'curse-filter'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { prismaMongo } from '@/lib/db'

// Define validation schema for updating a notable player
const updateNotablePlayerSchema = z.object({
  account_id: z.coerce.number().int().positive({ message: 'Account ID must be a positive number' }),
  country_code: z.string().max(3).optional(),
  name: z
    .string()
    .min(1)
    .refine((name) => !name || !detect(name), {
      message: 'Name contains inappropriate language. Please revise it.',
    }),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id || !session?.user?.twitchId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const id = req.query.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing player ID' })
      return
    }

    // Find the player, ensuring it belongs to the user's channel
    const player = await prismaMongo.notablePlayers.findFirst({
      select: {
        addedBy: true,
        country_code: true,
        createdAt: true,
        name: true,
      },
      where: {
        channel: session.user.twitchId,
        id,
      },
    })

    if (!player) {
      res.status(404).json({ error: 'Player not found' })
      return
    }

    // GET - Retrieve a specific notable player
    if (req.method === 'GET') {
      res.status(200).json(player)
      return
    }

    // PUT - Update a notable player
    if (req.method === 'PUT') {
      const validatedData = updateNotablePlayerSchema.parse(req.body)

      const updatedPlayer = await prismaMongo.notablePlayers.update({
        data: validatedData,
        where: { id },
      })

      res.status(200).json(updatedPlayer)
      return
    }

    // DELETE - Delete a notable player
    if (req.method === 'DELETE') {
      await prismaMongo.notablePlayers.delete({
        where: { id },
      })

      return res.status(204).end()
    }

    res.status(405).json({ error: 'Method not allowed' })
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
      return
    }

    console.error('Error in notable-players/[id] API:', error)
    captureException(error)
    res.status(500).json({ error: 'Internal server error' })
    return
  }
}

export default withMethods(['GET', 'PUT', 'DELETE'], withAuthentication(handler))
