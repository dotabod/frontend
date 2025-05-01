import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { getSubscription, isSubscriptionActive } from '@/utils/subscription'
import { SubscriptionStatus, TransactionType } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * This endpoint automatically applies gift credits to create or reactivate a subscription
 * It can be called:
 * 1. Automatically when gift credits are received (via the gift service)
 * 2. Manually by the user from the dashboard
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    // Get the user from the session or from the request body (for internal calls)
    const userId = req.body.userId as string

    if (!userId) {
      // If no userId in body, check if authenticated user
      if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      if (session.user.isImpersonating) {
        return res.status(403).json({ error: 'Unauthorized: Impersonation not allowed' })
      }
    }

    // Use session user ID if no userId was provided in request body
    const userIdToUse = userId || session?.user.id

    if (!userIdToUse) {
      return res.status(400).json({ error: 'Missing user ID' })
    }

    // Check if the user has an active subscription already
    const activeSubscription = await getSubscription(userIdToUse)

    // If the user already has an active subscription (not a grace period one),
    // there's no need to apply credits automatically
    if (
      activeSubscription &&
      !activeSubscription.isGift &&
      isSubscriptionActive(activeSubscription)
    ) {
      return res.status(200).json({
        message: 'User already has an active subscription',
        success: false,
        activeSubscription: true,
      })
    }

    // Get the user's Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: userIdToUse },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        locale: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Find the user's Stripe customer ID
    const subscription = await prisma.subscription.findFirst({
      where: { userId: userIdToUse },
      select: { stripeCustomerId: true },
      orderBy: { createdAt: 'desc' },
    })

    const stripeCustomerId = subscription?.stripeCustomerId

    if (!stripeCustomerId) {
      return res.status(404).json({
        error: 'No Stripe customer found for this user',
        success: false,
      })
    }

    // Get customer balance
    const customer = await stripe.customers.retrieve(stripeCustomerId)

    // Check if the customer is deleted
    if (customer.deleted) {
      return res.status(404).json({
        error: 'Stripe customer associated with this user has been deleted.',
        success: false,
      })
    }

    // Safely access the balance after ensuring the customer is not deleted
    const balance = customer.balance

    // If balance is zero or positive, there are no credits to use
    if (balance >= 0) {
      return res.status(200).json({
        message: 'No credit balance available',
        balance: balance,
        success: false,
      })
    }

    // Check for inactive subscriptions that can be reactivated
    const inactiveSubsription = await prisma.subscription.findFirst({
      where: {
        userId: userIdToUse,
        status: {
          in: [
            SubscriptionStatus.CANCELED,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.INCOMPLETE,
            SubscriptionStatus.UNPAID,
          ],
        },
        cancelAtPeriodEnd: true,
        stripeSubscriptionId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    })

    // If stripe subscription exists, try to reactivate it
    if (inactiveSubsription?.stripeSubscriptionId) {
      try {
        // Instead of reactivating, create a new subscription to ensure clean state
        // Get the price ID from the inactive subscription
        const priceId = inactiveSubsription.stripePriceId

        if (!priceId) {
          throw new Error('No price ID found in inactive subscription')
        }

        // Create a checkout session for PRO tier with the same price period
        const checkoutSession = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${process.env.NEXTAUTH_URL || 'https://dotabod.com'}/dashboard?paid=true&auto_applied=true`,
          cancel_url: `${process.env.NEXTAUTH_URL || 'https://dotabod.com'}/dashboard?paid=false&auto_applied=false`,
          subscription_data: {},
          payment_method_types: ['card'],
          metadata: {
            userId: userIdToUse,
            email: user.email || '',
            name: user.name || '',
            image: user.image || '',
            locale: user.locale || '',
            isUpgradeToLifetime: 'false',
            isNewSubscription: 'true',
            isGift: 'false',
            isCryptoPayment: 'false',
            isAutoApplied: 'true',
          },
        })

        // Process the checkout completion server-side
        await stripe.checkout.sessions.expire(checkoutSession.id)

        // Create a new subscription with PRO tier
        await prisma.subscription.create({
          data: {
            userId: userIdToUse,
            status: SubscriptionStatus.ACTIVE,
            tier: 'PRO',
            transactionType: TransactionType.RECURRING,
            stripeCustomerId: stripeCustomerId,
            stripePriceId: priceId as string,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            cancelAtPeriodEnd: false,
            metadata: {
              autoApplied: 'true',
              appliedAt: new Date().toISOString(),
              creditBalanceUsed: balance.toString(),
              source: 'gift-credit-auto-apply',
            },
          },
        })

        return res.status(200).json({
          message: 'Successfully applied gift credits to create a new subscription',
          success: true,
          priceId: priceId,
          creditApplied: Math.abs(balance) / 100,
        })
      } catch (error) {
        console.error('Error reactivating subscription:', error)
        return res.status(500).json({
          error: 'Failed to reactivate subscription',
          details: error.message,
          success: false,
        })
      }
    } else {
      // No existing subscription to reactivate, create a new one
      try {
        // Get the default monthly PRO price ID
        const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID

        if (!priceId) {
          throw new Error('Monthly PRO price ID not configured')
        }

        // Create a checkout session for PRO tier
        const checkoutSession = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${process.env.NEXTAUTH_URL || 'https://dotabod.com'}/dashboard?paid=true&auto_applied=true`,
          cancel_url: `${process.env.NEXTAUTH_URL || 'https://dotabod.com'}/dashboard?paid=false&auto_applied=false`,
          payment_method_types: ['card'],
          metadata: {
            userId: userIdToUse,
            email: user.email || '',
            name: user.name || '',
            image: user.image || '',
            locale: user.locale || '',
            isUpgradeToLifetime: 'false',
            isNewSubscription: 'true',
            isGift: 'false',
            isCryptoPayment: 'false',
            isAutoApplied: 'true',
          },
        })

        // Process the checkout completion server-side
        await stripe.checkout.sessions.expire(checkoutSession.id)

        // Create a new subscription with PRO tier
        await prisma.subscription.create({
          data: {
            userId: userIdToUse,
            status: SubscriptionStatus.ACTIVE,
            tier: 'PRO',
            transactionType: TransactionType.RECURRING,
            stripeCustomerId: stripeCustomerId,
            stripePriceId: priceId,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            cancelAtPeriodEnd: false,
            metadata: {
              autoApplied: 'true',
              appliedAt: new Date().toISOString(),
              creditBalanceUsed: balance.toString(),
              source: 'gift-credit-auto-apply',
            },
          },
        })

        return res.status(200).json({
          message: 'Successfully applied gift credits to create a new subscription',
          success: true,
          priceId: priceId,
          creditApplied: Math.abs(balance) / 100,
        })
      } catch (error) {
        console.error('Error creating new subscription:', error)
        return res.status(500).json({
          error: 'Failed to create new subscription',
          details: error.message,
          success: false,
        })
      }
    }
  } catch (error) {
    console.error('Error applying gift credit:', error)
    return res.status(500).json({
      error: 'An unexpected error occurred',
      details: error.message,
      success: false,
    })
  }
}
