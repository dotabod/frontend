import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { headers } from 'next/headers'

export async function POST(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { priceId } = await req.json()
    if (!priceId) {
      return new Response('Price ID is required', { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    })

    if (!user) {
      return new Response('User not found', { status: 404 })
    }

    let customerId = user.subscription?.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id

      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId: customerId,
        },
      })
    }

    const baseUrl = headers().get('origin') || 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      metadata: {
        userId: user.id,
      },
    })

    return new Response(JSON.stringify({ url: checkoutSession.url }))
  } catch (error) {
    console.error('Error in create-checkout:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
