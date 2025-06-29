import { SubscriptionStatus, TransactionType } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'
import { getServerSession } from '@/lib/api/getServerSession'
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

        // Directly create the subscription using the API
        // Stripe will automatically apply the customer's balance to the first invoice.
        const newStripeSubscription: Stripe.Subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
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
            isAutoApplied: 'true', // Indicate this was auto-applied via gift credit
          },
          // Optional: Add trial days or other parameters if needed
          // trial_period_days: 30, // Example: Give a 30-day trial
        })

        // Ensure the subscription was created successfully
        if (!newStripeSubscription || !newStripeSubscription.id) {
          throw new Error('Failed to create Stripe subscription object.')
        }

        // If the latest invoice exists and is paid (likely due to balance application),
        // determine the correct currentPeriodEnd. Otherwise, estimate 30 days.
        let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default: 30 days
        if (
          newStripeSubscription.latest_invoice &&
          typeof newStripeSubscription.latest_invoice === 'object' &&
          'status' in newStripeSubscription.latest_invoice && // Type guard for Invoice object
          newStripeSubscription.latest_invoice.status === 'paid' &&
          newStripeSubscription.items.data[0]?.current_period_end // Check if property exists
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
            userId: userIdToUse,
            status: SubscriptionStatus.ACTIVE, // Assume active, Stripe webhooks will update if payment fails
            tier: 'PRO',
            transactionType: TransactionType.RECURRING, // Or GIFT if fully paid by credit? Needs clarification.
            stripeCustomerId: stripeCustomerId,
            stripeSubscriptionId: newStripeSubscription.id, // Store the new Stripe Subscription ID
            stripePriceId: priceId as string,
            currentPeriodEnd: currentPeriodEnd,
            cancelAtPeriodEnd: false,
            isGift: false, // This subscription itself isn't a gift, it was paid for by gift *credit*
            metadata: {
              autoApplied: 'true',
              appliedAt: new Date().toISOString(),
              creditBalanceUsed: balance.toString(), // Record the balance *before* application
              source: 'gift-credit-auto-apply-reactivate-path',
            },
          },
        })

        return res.status(200).json({
          message: 'Successfully applied gift credits to create a new subscription',
          success: true,
          priceId: priceId,
          creditApplied: Math.abs(balance) / 100, // Show the amount of credit potentially used
        })
      } catch (error) {
        console.error('Error creating subscription from inactive path:', error)
        // Check for specific Stripe errors if needed
        // if (error instanceof Stripe.errors.StripeCardError) { ... }
        return res.status(500).json({
          error: 'Failed to create subscription using gift credits',
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

        // Directly create the subscription using the API
        // Stripe will automatically apply the customer's balance to the first invoice.
        const newStripeSubscription: Stripe.Subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
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
            isAutoApplied: 'true', // Indicate this was auto-applied via gift credit
          },
          // Optional: Add trial days or other parameters if needed
          // trial_period_days: 30, // Example: Give a 30-day trial
        })

        // Ensure the subscription was created successfully
        if (!newStripeSubscription || !newStripeSubscription.id) {
          throw new Error('Failed to create Stripe subscription object.')
        }

        // If the latest invoice exists and is paid (likely due to balance application),
        // determine the correct currentPeriodEnd. Otherwise, estimate 30 days.
        let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default: 30 days
        if (
          newStripeSubscription.latest_invoice &&
          typeof newStripeSubscription.latest_invoice === 'object' &&
          'status' in newStripeSubscription.latest_invoice && // Type guard for Invoice object
          newStripeSubscription.latest_invoice.status === 'paid' &&
          newStripeSubscription.items.data[0]?.current_period_end // Check if property exists
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
            userId: userIdToUse,
            status: SubscriptionStatus.ACTIVE, // Assume active, Stripe webhooks will update if payment fails
            tier: 'PRO',
            transactionType: TransactionType.RECURRING, // Or GIFT if fully paid by credit? Needs clarification.
            stripeCustomerId: stripeCustomerId,
            stripeSubscriptionId: newStripeSubscription.id, // Store the new Stripe Subscription ID
            stripePriceId: priceId,
            currentPeriodEnd: currentPeriodEnd,
            cancelAtPeriodEnd: false,
            isGift: false, // This subscription itself isn't a gift, it was paid for by gift *credit*
            metadata: {
              autoApplied: 'true',
              appliedAt: new Date().toISOString(),
              creditBalanceUsed: balance.toString(), // Record the balance *before* application
              source: 'gift-credit-auto-apply-new-path',
            },
          },
        })

        return res.status(200).json({
          message: 'Successfully applied gift credits to create a new subscription',
          success: true,
          priceId: priceId,
          creditApplied: Math.abs(balance) / 100, // Show the amount of credit potentially used
        })
      } catch (error) {
        console.error('Error creating new subscription:', error)
        // Check for specific Stripe errors if needed
        // if (error instanceof Stripe.errors.StripeCardError) { ... }
        return res.status(500).json({
          error: 'Failed to create new subscription using gift credits',
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
