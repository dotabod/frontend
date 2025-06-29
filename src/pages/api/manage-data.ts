import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { getSubscription } from '@/utils/subscription'

const requestSchema = z.object({
  action: z.enum(['export', 'delete']),
})

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

// Helper function to transform BigInt to String
function serializeData(data: unknown): JsonValue {
  if (data === null || data === undefined) {
    return null
  }

  if (data instanceof Date) {
    return data.toISOString()
  }

  if (typeof data === 'bigint') {
    return data.toString()
  }

  if (Array.isArray(data)) {
    return data.map(serializeData)
  }

  if (typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [
        key,
        serializeData(value),
      ]),
    )
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data
  }

  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (session.user.isImpersonating) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { action } = requestSchema.parse(req.body)

    if (action === 'export') {
      // Get all user data
      const userData = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          settings: true,
          SteamAccount: true,
          matches: true,
          streams: true,
          subscription: true,
          approvedModerators: true,
          mods_mods_mod_user_idTousers: true,
          mods_mods_streamer_user_idTousers: true,
        },
      })

      // Transform BigInt values before sending response
      const serializedData = serializeData(userData)

      return res.status(200).json({
        data: serializedData,
        message: 'Data exported successfully',
      })
    }

    if (action === 'delete') {
      // First get the user's subscription info
      const subscription = await getSubscription(session.user.id)

      // Cancel Stripe subscription if it exists
      if (subscription?.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
        } catch (error) {
          console.error('Error canceling Stripe subscription:', error)
        }
      }

      // Delete Stripe customer if it exists
      if (subscription?.stripeCustomerId) {
        try {
          await stripe.customers.del(subscription.stripeCustomerId)
        } catch (error) {
          console.error('Error deleting Stripe customer:', error)
        }
      }

      // Delete user data - Prisma will handle cascading deletes
      await prisma.user.delete({
        where: { id: session.user.id },
      })

      return res.status(200).json({
        message: 'Account deleted successfully',
      })
    }
  } catch (error) {
    console.error('Error managing data:', error)
    return res.status(500).json({ error: 'Failed to process request' })
  }
}
