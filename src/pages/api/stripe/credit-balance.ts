import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { getSubscription } from '@/utils/subscription'
import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'

/**
 * API endpoint to fetch a user's credit balance from Stripe
 *
 * @returns {Object} The user's credit balance
 * @returns {number} balance - The credit balance in cents (negative value = available credit)
 * @returns {string} formatted - The formatted balance as a string
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    // Prevent impersonation for security
    if (session?.user?.isImpersonating) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Ensure user is authenticated
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Try to find customer ID from subscription first
    const subscription = await getSubscription(session.user.id)
    let customerId = subscription?.stripeCustomerId

    // If no customer ID from subscription, check if user has any previous subscriptions with a customer ID
    if (!customerId) {
      const subscriptionWithCustomerId = await prisma.subscription.findFirst({
        where: {
          userId: session.user.id,
          stripeCustomerId: { not: null },
        },
        select: { stripeCustomerId: true },
      })

      customerId = subscriptionWithCustomerId?.stripeCustomerId || null
    }

    // If no customer ID exists anywhere, return 0 balance
    if (!customerId) {
      return res.status(200).json({
        balance: 0,
        formatted: '$0.00',
      })
    }

    // Retrieve the customer from Stripe to get their balance
    let typedCustomer: Stripe.Customer | null = null
    let balance = 0

    try {
      const customer = await stripe.customers.retrieve(customerId)
      if (customer.deleted) {
        return res.status(200).json({
          balance: 0,
          formatted: '$0.00',
        })
      }

      // Get the customer's balance (negative value = available credit)
      typedCustomer = customer as Stripe.Customer
      balance = typedCustomer.balance || 0
    } catch (stripeError) {
      console.error('Stripe customer retrieval error:', stripeError)
      // If the customer doesn't exist or there's a mode mismatch, return zero balance
      return res.status(200).json({
        balance: 0,
        formatted: '$0.00',
      })
    }

    // Format the balance for display
    // The balance is in cents, and negative values represent credits
    const hasCredit = balance < 0
    const absBalance = Math.abs(balance)
    const formatted = `$${(absBalance / 100).toFixed(2)}`

    const response = {
      balance: hasCredit ? Math.abs(balance) : 0, // Return positive value for credit
      formatted: hasCredit ? formatted : '$0.00',
    }
    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching credit balance:', error)
    return res.status(500).json({ error: 'Failed to fetch credit balance' })
  }
}
