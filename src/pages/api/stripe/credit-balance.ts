import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'

import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { getSubscription } from '@/utils/subscription'

/**
 * API endpoint to fetch a user's credit balance from Stripe
 *
 * @returns {Object} The user's credit balance
 * @returns {number} balance - The credit balance in cents (negative value = available credit)
 * @returns {string} formatted - The formatted balance as a string
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')

  try {
    const session = await getServerSession(req, res, authOptions)

    // Prevent impersonation for security
    if (session?.user?.isImpersonating) {
      res.status(403).json({ message: 'Unauthorized' })
      return
    }

    // Ensure user is authenticated
    if (!session?.user?.id) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    // Try to find customer ID from subscription first
    const subscription = await getSubscription(session.user.id)
    let customerId = subscription?.stripeCustomerId

    // If no customer ID from subscription, check if user has any previous subscriptions with a customer ID
    if (!customerId) {
      const subscriptionWithCustomerId = await prisma.subscription.findFirst({
        select: { stripeCustomerId: true },
        where: {
          stripeCustomerId: { not: null },
          userId: session.user.id,
        },
      })

      customerId = subscriptionWithCustomerId?.stripeCustomerId || null
    }

    // If no customer ID exists anywhere, return 0 balance
    if (!customerId) {
      res.status(200).json({
        balance: 0,
        formatted: '$0.00',
      })
      return
    }

    // Retrieve the customer from Stripe to get their balance
    let typedCustomer: Stripe.Customer | null = null
    let balance = 0

    try {
      const customer = await stripe.customers.retrieve(customerId)
      if (customer.deleted) {
        res.status(200).json({
          balance: 0,
          formatted: '$0.00',
        })
        return
      }

      // Get the customer's balance (negative value = available credit)
      typedCustomer = customer
      balance = typedCustomer.balance || 0
    } catch (stripeError) {
      console.error('Stripe customer retrieval error:', stripeError)
      // If the customer doesn't exist or there's a mode mismatch, return zero balance
      res.status(200).json({
        balance: 0,
        formatted: '$0.00',
      })
      return
    }

    // Format the balance for display
    // The balance is in cents, and negative values represent credits
    const hasCredit = balance < 0
    const absBalance = Math.abs(balance)
    const formatted = `$${(absBalance / 100).toFixed(2)}`

    const response = {
      // Return positive value for credit
      balance: hasCredit ? Math.abs(balance) : 0,
      formatted: hasCredit ? formatted : '$0.00',
    }
    res.status(200).json(response)
    return
  } catch (error) {
    console.error('Error fetching credit balance:', error)
    res.status(500).json({ error: 'Failed to fetch credit balance' })
    return
  }
}
