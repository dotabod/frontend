import { getServerSession } from '@/lib/api/getServerSession'
import { stripe } from '@/lib/stripe-server'
import prisma from '@/lib/db'
import { authOptions } from '@/lib/auth'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = await req.body
    const { priceId } = body

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' })
    }

    // Create or get customer
    const customer = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { stripeCustomerId: true },
    })

    let customerId = customer?.stripeCustomerId

    if (!customerId) {
      const newCustomer = await stripe.customers.create({
        email: session.user.email || undefined,
        metadata: {
          userId: session.user.id,
        },
      })
      customerId = newCustomer.id
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
    })

    return res.status(200).json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
