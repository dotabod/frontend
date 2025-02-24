import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { SUBSCRIPTION_TIERS } from '@/utils/subscription'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (session?.user?.isImpersonating) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const body = await req.body
    const { priceId, period } = body

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' })
    }

    // First check if user has a subscription record
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { stripeCustomerId: true },
    })

    let customerId = subscription?.stripeCustomerId

    if (customerId) {
      // Verify if customer still exists in Stripe
      try {
        await stripe.customers.retrieve(customerId)
      } catch (error) {
        // Customer was deleted in Stripe dashboard, clear the ID
        customerId = null

        // Update database to clear the invalid customer ID
        await prisma.subscription.update({
          where: { userId: session.user.id },
          data: {
            stripeCustomerId: null,
            stripePriceId: null,
            stripeSubscriptionId: null,
            status: 'inactive',
            tier: SUBSCRIPTION_TIERS.FREE,
          },
        })
      }
    }

    if (!customerId && session.user.email) {
      // If no valid customer ID, check if customer exists in Stripe by email
      const existingCustomers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        // Use existing customer
        customerId = existingCustomers.data[0].id
      } else {
        // Create new customer
        const newCustomer = await stripe.customers.create({
          email: session.user.email,
          metadata: {
            userId: session.user.id,
          },
        })
        customerId = newCustomer.id
      }

      // Create or update subscription record with new customer ID
      await prisma.subscription.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          stripeCustomerId: customerId,
          tier: SUBSCRIPTION_TIERS.FREE,
        },
        update: {
          stripeCustomerId: customerId,
          stripePriceId: null,
          stripeSubscriptionId: null,
          status: 'inactive',
        },
      })
    }

    if (!customerId) {
      return res.status(400).json({ error: 'Could not create or find customer' })
    }

    // Verify price type before creating checkout
    const price = await stripe.prices.retrieve(priceId)
    const isRecurring = price.type === 'recurring'

    // Create checkout session with trial period
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isRecurring ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?paid=true&trial=${isRecurring ? 'true' : 'false'}`,
      cancel_url: req.headers.referer?.includes('/dashboard')
        ? `${process.env.NEXTAUTH_URL}/dashboard/billing?paid=false`
        : `${process.env.NEXTAUTH_URL}/?paid=false`,
      subscription_data: isRecurring
        ? {
            trial_period_days: 14,
            trial_settings: {
              end_behavior: {
                missing_payment_method: 'cancel',
              },
            },
          }
        : undefined,
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
      metadata: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        locale: session.user.locale,
        twitchId: session.user.twitchId,
      },
    })

    return res.status(200).json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
