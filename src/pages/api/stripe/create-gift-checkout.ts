import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GIFT_PRICE_IDS } from '@/utils/subscription'
import { detect } from 'curse-filter'

// Function to check for profanity in text
const checkForProfanity = (text: string | undefined): boolean => {
  if (!text) return false
  return detect(text)
}

// Function to sanitize input
const sanitizeInput = (text: string | undefined): string => {
  if (!text) return ''
  // Basic sanitization - remove any HTML tags and limit length
  return text.replace(/<[^>]*>?/gm, '').substring(0, 200)
}

// Define the request schema for validation
const giftCheckoutSchema = z.object({
  recipientUsername: z.string().min(1, 'Recipient username is required'),
  priceId: z.string().min(1, 'Price ID is required'),
  giftMessage: z.string().optional(),
  giftSenderName: z.string().optional(),
  giftSenderEmail: z.string().email().optional(),
  quantity: z.number().int().min(1).default(1),
})

export type GiftCheckoutRequest = z.infer<typeof giftCheckoutSchema>

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the user session if available
    const userSession = await getServerSession(req, res, authOptions)

    // Parse and validate request body
    const body = await req.body
    const validationResult = giftCheckoutSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.format()

      return res.status(400).json({
        error: 'Invalid request data',
        details: errors,
      })
    }

    const { recipientUsername, priceId, giftMessage, giftSenderName, giftSenderEmail, quantity } =
      validationResult.data

    // Check for profanity in gift message and sender name
    if (giftMessage && checkForProfanity(giftMessage)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Gift message contains inappropriate language. Please revise it.',
      })
    }

    if (giftSenderName && checkForProfanity(giftSenderName)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Sender name contains inappropriate language. Please revise it.',
      })
    }

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

    if (hasLifetime) {
      return res.status(400).json({
        message:
          'The recipient already has a lifetime subscription. They cannot receive additional subscriptions.',
      })
    }

    // Create a checkout session for the gift
    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://dotabod.com'
    const successUrl = `${baseUrl}/gift-success?recipient=${encodeURIComponent(recipientUser.name || recipientUser.displayName || '')}`
    const cancelUrl = `${baseUrl}/gift?canceled=true`

    // Always use one-time payment mode for gift credits
    const finalQuantity = quantity

    // Get gift duration from price ID using GIFT_PRICE_IDS
    // Determine gift duration based on which price ID field matches
    const giftPriceInfo = GIFT_PRICE_IDS[0]
    const giftDuration =
      priceId === giftPriceInfo?.lifetime
        ? 'lifetime'
        : priceId === giftPriceInfo?.annual
          ? 'annual'
          : 'monthly'

    // Create the checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: finalQuantity,
          // Allow customers to adjust quantity during checkout
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
            maximum: 100,
          },
        },
      ],
      // Always use payment mode for gift credits
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      // Collect email if not logged in and no email provided
      customer_email: giftSenderEmail || userSession?.user?.email || undefined,
      metadata: {
        isGift: 'true',
        recipientUserId: recipientUser.id,
        recipientUsername,
        giftDuration,
        giftMessage: sanitizeInput(giftMessage),
        giftSenderName: sanitizeInput(giftSenderName) || 'Anonymous',
        giftQuantity: finalQuantity.toString(),
        // Add the gifter ID if the user is logged in
        gifterId: userSession?.user?.id || null,
        // Add gifter email if provided or available from session
        giftSenderEmail: giftSenderEmail || userSession?.user?.email || '',
        // Flag that we're using the customer balance approach
        useCustomerBalance: 'true',
      },
    })

    if (!checkoutSession.url) {
      throw new Error('Failed to create checkout session')
    }

    return res.status(200).json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Gift checkout creation failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: 'Failed to create gift checkout session',
      details: errorMessage,
    })
  }
}
