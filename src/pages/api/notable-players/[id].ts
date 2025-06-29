import { captureException } from '@sentry/nextjs'
import { detect } from 'curse-filter'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import { prismaMongo } from '@/lib/db'

// Define validation schema for updating a notable player
const updateNotablePlayerSchema = z.object({
  name: z
    .string()
    .min(1)
    .refine((name) => !name || !detect(name), {
      message: 'Name contains inappropriate language. Please revise it.',
    }),
  country_code: z.string().max(3).optional(),
  account_id: z.coerce.number().int().positive({ message: 'Account ID must be a positive number' }),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id || !session?.user?.twitchId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const id = req.query.id as string
    if (!id) {
      return res.status(400).json({ error: 'Missing player ID' })
    }

    // Find the player, ensuring it belongs to the user's channel
    const player = await prismaMongo.notablePlayers.findFirst({
      select: {
        name: true,
        country_code: true,
        addedBy: true,
        createdAt: true,
      },
      where: {
        id,
        channel: `${session.user.twitchId}`,
      },
    })

    if (!player) {
      return res.status(404).json({ error: 'Player not found' })
    }

    // GET - Retrieve a specific notable player
    if (req.method === 'GET') {
      return res.status(200).json(player)
    }

    // PUT - Update a notable player
    if (req.method === 'PUT') {
      const validatedData = updateNotablePlayerSchema.parse(req.body)

      const updatedPlayer = await prismaMongo.notablePlayers.update({
        where: { id },
        data: validatedData,
      })

      return res.status(200).json(updatedPlayer)
    }

    // DELETE - Delete a notable player
    if (req.method === 'DELETE') {
      await prismaMongo.notablePlayers.delete({
        where: { id },
      })

      return res.status(204).end()
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }

    console.error('Error in notable-players/[id] API:', error)
    captureException(error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withMethods(['GET', 'PUT', 'DELETE'], withAuthentication(handler))
