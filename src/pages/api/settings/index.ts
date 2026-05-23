import type { Prisma } from '@prisma/client'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { Settings } from '@/lib/defaultSettings'
import { dynamicSettingSchema, settingKeySchema } from '@/lib/validations/setting'
import {
  FEATURE_TIERS,
  GRACE_PERIOD_END,
  getSubscription,
  isInGracePeriod,
  isSubscriptionActive,
  SUBSCRIPTION_TIERS,
} from '@/utils/subscription'

const subscriptionRelationQuery = {
  orderBy: [{ status: 'asc' }, { transactionType: 'desc' }, { createdAt: 'desc' }],
  select: {
    cancelAtPeriodEnd: true,
    createdAt: true,
    currentPeriodEnd: true,
    giftDetails: {
      select: {
        giftMessage: true,
        giftQuantity: true,
        giftType: true,
        senderName: true,
      },
    },
    id: true,
    isGift: true,
    metadata: true,
    status: true,
    stripeCustomerId: true,
    stripePriceId: true,
    stripeSubscriptionId: true,
    tier: true,
    transactionType: true,
  },
  where: {
    OR: [
      {
        isGift: false,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
        },
      },
      {
        status: { in: ['ACTIVE'] },
        transactionType: 'LIFETIME',
      },
    ],
  },
} satisfies Prisma.SubscriptionFindManyArgs

type SettingsSubscriptionRow = Prisma.SubscriptionGetPayload<{
  select: typeof subscriptionRelationQuery.select
}>

function getSettingsSubscription(subscriptions: SettingsSubscriptionRow[]) {
  const activeSubscription = subscriptions.find(
    (sub) => (sub.status === 'ACTIVE' || sub.status === 'TRIALING') && sub.stripeSubscriptionId,
  )

  const subscription = activeSubscription || subscriptions[0] || null

  if (!subscription && isInGracePeriod()) {
    return {
      cancelAtPeriodEnd: true,
      createdAt: new Date(),
      currentPeriodEnd: GRACE_PERIOD_END,
      giftDetails: null,
      isGift: false,
      isGracePeriodVirtual: true,
      isVirtual: true,
      status: 'TRIALING' as const,
      stripeCustomerId: '',
      stripePriceId: '',
      stripeSubscriptionId: null,
      tier: SUBSCRIPTION_TIERS.PRO,
      transactionType: 'RECURRING' as const,
    }
  }

  if (!subscription || !isSubscriptionActive(subscription)) {
    return {
      status: null,
      stripePriceId: '',
      tier: SUBSCRIPTION_TIERS.FREE,
    }
  }

  return {
    ...subscription,
    tier: subscription.tier,
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  const userId = req.query.id as string | undefined
  const username = req.query.username as string | undefined

  if (username) {
    if (req.method === 'GET') {
      try {
        res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')

        // Use findFirst instead of findFirstOrThrow to handle not found cases gracefully
        const data = await prisma.user.findFirst({
          select: {
            createdAt: true,
            displayName: true,
            image: true,
            name: true,
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
            stream_online: true,
            subscription: {
              ...subscriptionRelationQuery,
            },
          },
          where: {
            name: username.toLowerCase(),
          },
        })

        if (!data) {
          return res.json({})
        }

        const subscription = getSettingsSubscription(data.subscription)

        const { subscription: _subscriptionRows, ...userData } = data

        return res.json({
          ...userData,
          subscription,
        })
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
      const resolvedUserId = userId ?? session?.user?.id
      if (!resolvedUserId) {
        return res.status(403).json({ message: 'Unauthorized' })
      }

      const isPublicOverlayRequest = Boolean(userId)
      if (isPublicOverlayRequest) {
        res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
      } else {
        res.setHeader('Cache-Control', 'private, no-store')
      }

      const data = await prisma.user.findFirst({
        select: {
          Account: {
            select: {
              providerAccountId: true,
            },
          },
          SteamAccount: {
            select: {
              leaderboard_rank: true,
              mmr: true,
              steam32Id: true,
            },
          },
          beta_tester: true,
          mmr: true,
          settings: {
            select: {
              key: true,
              value: true,
            },
          },
          steam32Id: true,
          stream_online: true,
          subscription: {
            ...subscriptionRelationQuery,
          },
        },
        where: {
          id: resolvedUserId,
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

      const subscription = getSettingsSubscription(data.subscription)

      const { subscription: _subscriptionRows, ...userData } = data

      return res.json({
        ...userData,
        subscription,
      })
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
            userId: session.user.id,
            value: validatedBody.value,
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

export default withMethods(['GET', 'POST'], handler)
