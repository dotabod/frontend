import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { Settings } from '@/lib/defaultSettings'
import { dynamicSettingSchema, settingKeySchema } from '@/lib/validations/setting'
import { FEATURE_TIERS, getSubscription } from '@/utils/subscription'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  const userId = req.query.id as string | undefined
  const username = req.query.username as string | undefined

  if (username) {
    if (req.method === 'GET') {
      try {
        // Attempt to find a user with the specified conditions
        const data = await prisma.user.findFirstOrThrow({
          select: {
            displayName: true,
            name: true,
            stream_online: true,
            image: true,
            createdAt: true,
            settings: {
              select: {
                key: true,
                value: true,
              },
              where: {
                key: {
                  startsWith: 'command',
                },
              },
            },
          },
          where: {
            name: username.toLowerCase(),
          },
        })

        if (!data) {
          return res.json({})
        }

        return res.json(data)
      } catch (error) {
        captureException(error)
        console.error(error)
        return res.status(404).json({
          error: 'User not found',
        })
      }
    }
  }

  if (!userId && !session?.user?.id) {
    return res.status(403).json({ message: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const data = await prisma.user.findFirst({
        select: {
          stream_online: true,
          settings: {
            select: {
              key: true,
              value: true,
            },
          },
          beta_tester: true,
          Account: {
            select: {
              providerAccountId: true,
            },
          },
          SteamAccount: {
            select: {
              mmr: true,
              leaderboard_rank: true,
              steam32Id: true,
            },
          },
          mmr: true,
          steam32Id: true,
        },
        where: {
          id: userId ?? session?.user?.id,
        },
      })

      if (!data) {
        return res.status(404).json({ message: 'User not found' })
      }

      if (session?.user?.isImpersonating) {
        // Filter out obsServerPassword
        data.settings = data.settings.filter(
          (setting) => setting.key !== Settings.obsServerPassword,
        )
      }

      return res.json(data)
    } catch (error) {
      captureException(error)
      console.error('Error fetching user:', error)
      return res.status(500).end()
    }
  }

  if (req.method === 'POST') {
    if (!session?.user?.id) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    try {
      const parsedBody = JSON.parse(req.body)

      const keyValidation = settingKeySchema.safeParse(parsedBody.key)
      if (!keyValidation.success) {
        return res.status(422).json({ error: 'Invalid setting key' })
      }

      // Get user's subscription
      const subscription = await getSubscription(session.user.id)
      const validKey = keyValidation.data
      const schema = dynamicSettingSchema(validKey, subscription)

      try {
        const validatedBody = schema.parse(parsedBody)

        if (session.user.isImpersonating) {
          if (validatedBody.key === Settings.obsServerPassword) {
            return res.status(403).json({ message: 'Forbidden' })
          }
        }

        const post = await prisma.setting.create({
          data: {
            key: validatedBody.key,
            value: validatedBody.value,
            userId: session.user.id,
          },
          select: {
            id: true,
          },
        })

        return res.json(post)
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Check if error is related to subscription access
          const subscriptionError = error.errors.find(
            (e) => e.message === 'Your subscription tier does not have access to this feature',
          )
          if (subscriptionError) {
            return res.status(403).json({
              error: 'Subscription tier does not have access to this feature',
              requiredTier: FEATURE_TIERS[validKey],
            })
          }
          return res.status(422).json(error.issues)
        }
        throw error
      }
    } catch (error) {
      captureException(error)
      console.error('Error creating setting:', error)
      return res.status(500).end()
    }
  }
}

export default withMethods(['GET', 'POST'], withAuthentication(handler))
