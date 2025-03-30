import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe-server'
import { getSubscription } from '@/utils/subscription'
import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'
import prisma from '@/lib/db'

/**
 * API endpoint to fetch a user's credit balance from Stripe
 *
 * @returns {Object} The user's credit balance
 * @returns {number} balance - The credit balance in cents (negative value = available credit)
 * @returns {string} formatted - The formatted balance as a string
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Credit balance API called', { method: req.method })

  if (req.method !== 'GET') {
    console.log('Method not allowed', { method: req.method })
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    // Prevent impersonation for security
    if (session?.user?.isImpersonating) {
      console.log('Impersonation detected, unauthorized')
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Ensure user is authenticated
    if (!session?.user?.id) {
      console.log('No user ID in session, unauthorized')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Try to find customer ID from subscription first
    console.log('Fetching subscription for user', { userId: session.user.id })
    const subscription = await getSubscription(session.user.id)
    let customerId = subscription?.stripeCustomerId
    console.log('Subscription retrieved', { hasSubscription: !!subscription, customerId })

    // If no customer ID from subscription, check if user has any previous subscriptions with a customer ID
    if (!customerId) {
      console.log('No active subscription found, checking for any subscription with customer ID')
      const subscriptionWithCustomerId = await prisma.subscription.findFirst({
        where: {
          userId: session.user.id,
          stripeCustomerId: { not: null },
        },
        select: { stripeCustomerId: true },
      })

      customerId = subscriptionWithCustomerId?.stripeCustomerId || null
      console.log('Previous subscription customer ID check', { hasCustomerId: !!customerId })
    }

    // If no customer ID exists anywhere, return 0 balance
    if (!customerId) {
      console.log('No customer ID found, returning zero balance')
      return res.status(200).json({
        balance: 0,
        formatted: '$0.00',
      })
    }

    // Retrieve the customer from Stripe to get their balance
    console.log('Retrieving customer from Stripe', { customerId })
    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) {
      console.log('Customer was deleted in Stripe')
      return res.status(200).json({
        balance: 0,
        formatted: '$0.00',
      })
    }

    // Get the customer's balance (negative value = available credit)
    const typedCustomer = customer as Stripe.Customer
    const balance = typedCustomer.balance || 0
    console.log('Customer balance retrieved', { balance })

    // Format the balance for display
    // The balance is in cents, and negative values represent credits
    const hasCredit = balance < 0
    const absBalance = Math.abs(balance)
    const formatted = `$${(absBalance / 100).toFixed(2)}`
    console.log('Formatted balance', { hasCredit, absBalance, formatted })

    const response = {
      balance: hasCredit ? Math.abs(balance) : 0, // Return positive value for credit
      formatted: hasCredit ? formatted : '$0.00',
    }
    console.log('Returning response', response)
    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching credit balance:', error)
    return res.status(500).json({ error: 'Failed to fetch credit balance' })
  }
}
