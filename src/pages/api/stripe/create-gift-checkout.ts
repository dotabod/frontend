import { detect } from 'curse-filter'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { z } from 'zod/v4'

import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { getGiftDuration, getGiftTextValidationError } from '@/lib/stripe/gift-checkout'
import { giftCheckoutSchema } from '@/lib/stripe/gift-checkout-request'
import type { GiftCheckoutRequest } from '@/lib/stripe/gift-checkout-request'
import { GIFT_PRICE_IDS } from '@/utils/subscription'

// Function to check for profanity in text
const checkForProfanity = (text: string | undefined): boolean => {
  if (text === undefined || text === '') {
    return false
  }
  return detect(text)
}

export type { GiftCheckoutRequest } from '@/lib/stripe/gift-checkout-request'

const getFirstNonEmptyString = (...values: (string | null | undefined)[]): string | undefined => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return undefined
}

type GiftRecipientResult =
  | { status: 'has-lifetime-subscription' }
  | { status: 'not-found' }
  | {
      status: 'eligible'
      user: NonNullable<Awaited<ReturnType<typeof prisma.user.findFirst>>>
    }

const findGiftRecipient = async (recipientUsername: string): Promise<GiftRecipientResult> => {
  const recipientUser = await prisma.user.findFirst({
    where: {
      OR: [{ displayName: recipientUsername }, { name: recipientUsername }],
    },
  })

  if (recipientUser === null) {
    return { status: 'not-found' }
  }

  const recipientSubscriptions = await prisma.subscription.findMany({
    include: { giftDetails: true },
    where: {
      status: 'ACTIVE',
      userId: recipientUser.id,
    },
  })
  const hasLifetimeSubscription = recipientSubscriptions.some(
    (subscription) =>
      subscription.giftDetails?.giftType === 'lifetime' ||
      (subscription.tier === 'PRO' && subscription.transactionType === 'LIFETIME'),
  )

  if (hasLifetimeSubscription) {
    return { status: 'has-lifetime-subscription' }
  }

  return { status: 'eligible', user: recipientUser }
}

const createGiftCheckout = async ({
  giftSenderEmail,
  giftSenderName,
  giftMessage,
  priceId,
  quantity,
  recipientUser,
  recipientUsername,
  userSession,
}: GiftCheckoutRequest & {
  recipientUser: NonNullable<Awaited<ReturnType<typeof prisma.user.findFirst>>>
  userSession: Session | null
}) => {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://dotabod.com'
  const [giftPriceInfo] = GIFT_PRICE_IDS
  const recipientDisplayName = getFirstNonEmptyString(recipientUser.displayName, recipientUser.name)
  const checkoutSession = await stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    cancel_url: `${baseUrl}/gift?canceled=true`,
    customer_email: getFirstNonEmptyString(giftSenderEmail, userSession?.user?.email),
    line_items: [
      {
        adjustable_quantity: {
          enabled: true,
          maximum: 100,
          minimum: 1,
        },
        price: priceId,
        quantity,
      },
    ],
    metadata: {
      giftDuration: getGiftDuration(priceId, giftPriceInfo),
      giftMessage: giftMessage ?? '',
      giftQuantity: quantity.toString(),
      giftSenderEmail: getFirstNonEmptyString(giftSenderEmail, userSession?.user?.email) ?? '',
      giftSenderName: getFirstNonEmptyString(giftSenderName) ?? 'Anonymous',
      gifterId: userSession?.user?.id ?? null,
      isGift: 'true',
      recipientDisplayName: recipientDisplayName ?? '',
      recipientUserId: recipientUser.id,
      recipientUsername,
      useCustomerBalance: 'true',
    },
    mode: 'payment',
    payment_method_types: ['card'],
    success_url: `${baseUrl}/gift-success?session_id={CHECKOUT_SESSION_ID}`,
  })

  if (checkoutSession.url === null) {
    throw new Error('Failed to create checkout session')
  }

  return checkoutSession.url
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Get the user session if available
    const userSession = await getServerSession(req, res, authOptions)

    // Parse and validate request body
    const validationResult = giftCheckoutSchema.safeParse(req.body)

    if (!validationResult.success) {
      const errors = z.treeifyError(validationResult.error)

      res.status(400).json({
        details: errors,
        error: 'Invalid request data',
      })
      return
    }

    const { recipientUsername, priceId, giftMessage, giftSenderName, giftSenderEmail, quantity } =
      validationResult.data

    const textValidationError = getGiftTextValidationError(
      { giftMessage, giftSenderName },
      checkForProfanity,
    )
    if (textValidationError === 'message') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Gift message contains inappropriate language. Please revise it.',
      })
      return
    }

    if (textValidationError === 'senderName') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Sender name contains inappropriate language. Please revise it.',
      })
      return
    }

    const recipient = await findGiftRecipient(recipientUsername)
    if (recipient.status === 'not-found') {
      res.status(404).json({ error: 'Recipient not found' })
      return
    }

    if (recipient.status === 'has-lifetime-subscription') {
      res.status(400).json({
        message:
          'The recipient already has a lifetime subscription. They cannot receive additional subscriptions.',
      })
      return
    }

    const url = await createGiftCheckout({
      giftMessage,
      giftSenderEmail,
      giftSenderName,
      priceId,
      quantity,
      recipientUser: recipient.user,
      recipientUsername,
      userSession,
    })

    res.status(200).json({ url })
  } catch (error) {
    console.error('Gift checkout creation failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({
      details: errorMessage,
      error: 'Failed to create gift checkout session',
    })
  }
}
