import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import prisma from '@/lib/db'
import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import * as z from 'zod'

const userCreateSchema = z.object({
  // emailVerified:
  mmr: z.number().nullable(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })
  const userId = req.query.id as string

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id: session ? session?.user?.id : userId,
        },
      })

      return res.json(user)
    } catch (error) {
      console.log('error', error)
      return res.status(500).end()
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = userCreateSchema.parse(JSON.parse(req.body))

      await prisma.user.update({
        data: {
          mmr: body.mmr,
        },
        where: {
          id: session?.user?.id,
        },
      })

      return res.end()
    } catch (error) {
      console.log('error', error);
      if (error instanceof z.ZodError) {
        return res.status(422).json(error.issues)
      }
      
      return res.status(500).end()
    }
  }
}

export default withMethods(['GET', 'PATCH'], withAuthentication(handler))
