import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { SUBSCRIPTION_TIERS, getPriceId } from '@/utils/subscription'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

// Define the request schema for validation
const giftCheckoutSchema = z.object({
  recipientUsername: z.string().min(1, 'Recipient username is required'),
  priceId: z.string().min(1, 'Price ID is required'),
  giftDuration: z.enum(['monthly', 'annual', 'lifetime']),
  giftMessage: z.string().optional(),
  giftSenderName: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
})

export type GiftCheckoutRequest = z.infer<typeof giftCheckoutSchema>

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse and validate request body
    const body = await req.body
    const validationResult = giftCheckoutSchema.safeParse(body)

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.format(),
      })
    }

    const { recipientUsername, priceId, giftDuration, giftMessage, giftSenderName, quantity } =
      validationResult.data

    // Find the recipient user by username (name or displayName)
    const recipientUser = await prisma.user.findFirst({
      where: {
        OR: [{ name: recipientUsername }, { displayName: recipientUsername }],
      },
    })

    if (!recipientUser) {
      return res.status(404).json({ error: 'Recipient not found' })
    }

    // Check if the recipient already has a lifetime subscription
    const recipientSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: recipientUser.id,
        status: 'ACTIVE',
      },
      include: {
        giftDetails: true,
      },
    })

    // Check if recipient has a lifetime subscription
    const hasLifetime = recipientSubscriptions.some(
      (sub) =>
        sub.giftDetails?.giftType === 'lifetime' ||
        (sub.tier === 'PRO' && sub.transactionType === 'LIFETIME'),
    )

    if (hasLifetime && priceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'lifetime')) {
      return res.status(400).json({
        message:
          'The recipient already has a lifetime subscription. Please choose a different gift or recipient.',
      })
    }

    // Create a checkout session for the gift
    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://dotabod.com'
    const successUrl = `${baseUrl}/gift-success?recipient=${encodeURIComponent(recipientUser.name || recipientUser.displayName || '')}`
    const cancelUrl = `${baseUrl}/gift?canceled=true`

    // Determine if this is a one-time payment (lifetime) or subscription
    const isLifetime = giftDuration === 'lifetime'

    // For lifetime, quantity doesn't make sense, so we enforce quantity = 1
    const finalQuantity = isLifetime ? 1 : quantity

    // Create the checkout session with the correct quantity in line items
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: finalQuantity,
          // Allow customers to adjust quantity during checkout (except for lifetime)
          adjustable_quantity: isLifetime
            ? undefined
            : {
                enabled: true,
                minimum: 1,
                maximum: 100,
              },
        },
      ],
      // Use Stripe's subscription mode for non-lifetime gifts to leverage Stripe's billing capabilities
      // For lifetime gifts, use payment mode
      mode: isLifetime ? 'payment' : 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        isGift: 'true',
        recipientUserId: recipientUser.id,
        recipientUsername,
        giftDuration,
        giftMessage: giftMessage || '',
        giftSenderName: giftSenderName || 'Anonymous',
        giftQuantity: finalQuantity.toString(),
        noAutoRenew: 'true', // Add metadata to indicate this should not auto-renew
      },
      // We'll handle subscription configuration in the webhook
    })

    if (!session.url) {
      throw new Error('Failed to create checkout session')
    }

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Gift checkout creation failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'Failed to create gift checkout session',
      details: errorMessage,
    })
  }
}
