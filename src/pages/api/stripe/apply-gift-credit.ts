import { SubscriptionStatus, TransactionType } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'

import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { getSubscription, isSubscriptionActive } from '@/utils/subscription'

/**
 * This endpoint automatically applies gift credits to create or reactivate a subscription
 * It can be called:
 * 1. Automatically when gift credits are received (via the gift service)
 * 2. Manually by the user from the dashboard
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    // Get the user from the session or from the request body (for internal calls)
    const userId = req.body.userId as string

    if (!userId) {
      // If no userId in body, check if authenticated user
      if (!session?.user) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      if (session.user.isImpersonating) {
        res.status(403).json({ error: 'Unauthorized: Impersonation not allowed' })
        return
      }
    }

    // Use session user ID if no userId was provided in request body
    const userIdToUse = userId || session?.user.id

    if (!userIdToUse) {
      res.status(400).json({ error: 'Missing user ID' })
      return
    }

    // Check if the user has an active subscription already
    const activeSubscription = await getSubscription(userIdToUse)

    // If the user already has an active subscription (not a grace period one),
    // There's no need to apply credits automatically
    if (
      activeSubscription &&
      !activeSubscription.isGift &&
      isSubscriptionActive(activeSubscription)
    ) {
      res.status(200).json({
        activeSubscription: true,
        message: 'User already has an active subscription',
        success: false,
      })
      return
    }

    // Get the user's Stripe customer ID
    const user = await prisma.user.findUnique({
      select: {
        email: true,
        id: true,
        image: true,
        locale: true,
        name: true,
      },
      where: { id: userIdToUse },
    })

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Find the user's Stripe customer ID
    const subscription = await prisma.subscription.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { stripeCustomerId: true },
      where: { userId: userIdToUse },
    })

    const stripeCustomerId = subscription?.stripeCustomerId

    if (!stripeCustomerId) {
      res.status(404).json({
        error: 'No Stripe customer found for this user',
        success: false,
      })
      return
    }

    // Get customer balance
    const customer = await stripe.customers.retrieve(stripeCustomerId)

    // Check if the customer is deleted
    if (customer.deleted) {
      res.status(404).json({
        error: 'Stripe customer associated with this user has been deleted.',
        success: false,
      })
      return
    }

    // Safely access the balance after ensuring the customer is not deleted
    const { balance } = customer

    // If balance is zero or positive, there are no credits to use
    if (balance >= 0) {
      res.status(200).json({
        balance,
        message: 'No credit balance available',
        success: false,
      })
      return
    }

    // Check for inactive subscriptions that can be reactivated
    const inactiveSubsription = await prisma.subscription.findFirst({
      orderBy: { createdAt: 'desc' },
      where: {
        cancelAtPeriodEnd: true,
        status: {
          in: [
            SubscriptionStatus.CANCELED,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.INCOMPLETE,
            SubscriptionStatus.UNPAID,
          ],
        },
        stripeSubscriptionId: { not: null },
        userId: userIdToUse,
      },
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

        // Directly create the subscription using the API
        // Stripe will automatically apply the customer's balance to the first invoice.
        const newStripeSubscription: Stripe.Subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          metadata: {
            email: user.email || '',
            image: user.image || '',
            // Indicate this was auto-applied via gift credit
            isAutoApplied: 'true',
            isCryptoPayment: 'false',
            isGift: 'false',
            isNewSubscription: 'true',
            isUpgradeToLifetime: 'false',
            locale: user.locale || '',
            name: user.name || '',
            userId: userIdToUse,
          },
          // Optional: Add trial days or other parameters if needed
          // Trial_period_days: 30, // Example: Give a 30-day trial
        })

        // Ensure the subscription was created successfully
        if (!newStripeSubscription?.id) {
          throw new Error('Failed to create Stripe subscription object.')
        }

        // If the latest invoice exists and is paid (likely due to balance application),
        // Determine the correct currentPeriodEnd. Otherwise, estimate 30 days.
        // Default: 30 days
        let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        if (
          newStripeSubscription.latest_invoice &&
          typeof newStripeSubscription.latest_invoice === 'object' &&
          // Type guard for Invoice object
          'status' in newStripeSubscription.latest_invoice &&
          newStripeSubscription.latest_invoice.status === 'paid' &&
          // Check if property exists
          newStripeSubscription.items.data[0]?.current_period_end
        ) {
          // Use the period end from the Stripe subscription object if available
          currentPeriodEnd = new Date(
            newStripeSubscription.items.data[0]?.current_period_end * 1000,
          )
        } else if (newStripeSubscription.items.data[0]?.current_period_end) {
          // Fallback to Stripe's period end even if invoice status is not 'paid' yet
          currentPeriodEnd = new Date(
            newStripeSubscription.items.data[0]?.current_period_end * 1000,
          )
        }

        // Create a new subscription record in Prisma
        await prisma.subscription.create({
          data: {
            cancelAtPeriodEnd: false,
            currentPeriodEnd,
            // This subscription itself isn't a gift, it was paid for by gift *credit*
            isGift: false,
            metadata: {
              appliedAt: new Date().toISOString(),
              autoApplied: 'true',
              // Record the balance *before* application
              creditBalanceUsed: balance.toString(),
              source: 'gift-credit-auto-apply-reactivate-path',
            },
            // Assume active, Stripe webhooks will update if payment fails
            status: SubscriptionStatus.ACTIVE,
            stripeCustomerId,
            stripePriceId: priceId,
            // Store the new Stripe Subscription ID
            stripeSubscriptionId: newStripeSubscription.id,
            tier: 'PRO',
            // Or GIFT if fully paid by credit? Needs clarification.
            transactionType: TransactionType.RECURRING,
            userId: userIdToUse,
          },
        })

        res.status(200).json({
          // Show the amount of credit potentially used
          creditApplied: Math.abs(balance) / 100,
          message: 'Successfully applied gift credits to create a new subscription',
          priceId,
          success: true,
        })
        return
      } catch (error) {
        console.error('Error creating subscription from inactive path:', error)
        // Check for specific Stripe errors if needed
        // If (error instanceof Stripe.errors.StripeCardError) { ... }
        res.status(500).json({
          details: error.message,
          error: 'Failed to create subscription using gift credits',
          success: false,
        })
        return
      }
    } else {
      // No existing subscription to reactivate, create a new one
      try {
        // Get the default monthly PRO price ID
        const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID

        if (!priceId) {
          throw new Error('Monthly PRO price ID not configured')
        }

        // Directly create the subscription using the API
        // Stripe will automatically apply the customer's balance to the first invoice.
        const newStripeSubscription: Stripe.Subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          metadata: {
            email: user.email || '',
            image: user.image || '',
            // Indicate this was auto-applied via gift credit
            isAutoApplied: 'true',
            isCryptoPayment: 'false',
            isGift: 'false',
            isNewSubscription: 'true',
            isUpgradeToLifetime: 'false',
            locale: user.locale || '',
            name: user.name || '',
            userId: userIdToUse,
          },
          // Optional: Add trial days or other parameters if needed
          // Trial_period_days: 30, // Example: Give a 30-day trial
        })

        // Ensure the subscription was created successfully
        if (!newStripeSubscription?.id) {
          throw new Error('Failed to create Stripe subscription object.')
        }

        // If the latest invoice exists and is paid (likely due to balance application),
        // Determine the correct currentPeriodEnd. Otherwise, estimate 30 days.
        // Default: 30 days
        let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        if (
          newStripeSubscription.latest_invoice &&
          typeof newStripeSubscription.latest_invoice === 'object' &&
          // Type guard for Invoice object
          'status' in newStripeSubscription.latest_invoice &&
          newStripeSubscription.latest_invoice.status === 'paid' &&
          // Check if property exists
          newStripeSubscription.items.data[0]?.current_period_end
        ) {
          // Use the period end from the Stripe subscription object if available
          currentPeriodEnd = new Date(
            newStripeSubscription.items.data[0]?.current_period_end * 1000,
          )
        } else if (newStripeSubscription.items.data[0]?.current_period_end) {
          // Fallback to Stripe's period end even if invoice status is not 'paid' yet
          currentPeriodEnd = new Date(
            newStripeSubscription.items.data[0]?.current_period_end * 1000,
          )
        }

        // Create a new subscription record in Prisma
        await prisma.subscription.create({
          data: {
            cancelAtPeriodEnd: false,
            currentPeriodEnd,
            // This subscription itself isn't a gift, it was paid for by gift *credit*
            isGift: false,
            metadata: {
              appliedAt: new Date().toISOString(),
              autoApplied: 'true',
              // Record the balance *before* application
              creditBalanceUsed: balance.toString(),
              source: 'gift-credit-auto-apply-new-path',
            },
            // Assume active, Stripe webhooks will update if payment fails
            status: SubscriptionStatus.ACTIVE,
            stripeCustomerId,
            stripePriceId: priceId,
            // Store the new Stripe Subscription ID
            stripeSubscriptionId: newStripeSubscription.id,
            tier: 'PRO',
            // Or GIFT if fully paid by credit? Needs clarification.
            transactionType: TransactionType.RECURRING,
            userId: userIdToUse,
          },
        })

        res.status(200).json({
          // Show the amount of credit potentially used
          creditApplied: Math.abs(balance) / 100,
          message: 'Successfully applied gift credits to create a new subscription',
          priceId,
          success: true,
        })
        return
      } catch (error) {
        console.error('Error creating new subscription:', error)
        // Check for specific Stripe errors if needed
        // If (error instanceof Stripe.errors.StripeCardError) { ... }
        res.status(500).json({
          details: error.message,
          error: 'Failed to create new subscription using gift credits',
          success: false,
        })
        return
      }
    }
  } catch (error) {
    console.error('Error applying gift credit:', error)
    res.status(500).json({
      details: error.message,
      error: 'An unexpected error occurred',
      success: false,
    })
    return
  }
}
