import { Prisma } from '@prisma/client'
import type Stripe from 'stripe'
import prisma from '@/lib/db'
import { createNowPaymentsInvoice } from '@/lib/nowpayments'

interface Params {
  stripeInvoice: Pick<Stripe.Invoice, 'id' | 'customer' | 'currency' | 'amount_remaining'>
  userId: string
  orderDescription: string
  metadata?: Record<string, unknown>
}

export async function createAndStoreCryptoInvoice({
  stripeInvoice,
  userId,
  orderDescription,
  metadata,
}: Params): Promise<{ url: string; nowPaymentsId: string }> {
  if (!stripeInvoice.id) {
    throw new Error('Stripe invoice has no id')
  }

  const amountRemaining = stripeInvoice.amount_remaining ?? 0
  if (amountRemaining <= 0) {
    throw new Error('Stripe invoice has no balance due')
  }

  const priceAmount = amountRemaining / 100
  const priceCurrency = (stripeInvoice.currency || 'usd').toLowerCase()
  const baseUrl = process.env.NEXTAUTH_URL || 'https://dotabod.com'

  const npInvoice = await createNowPaymentsInvoice({
    cancel_url: `${baseUrl}/dashboard/billing?paid=false`,
    ipn_callback_url: `${baseUrl}/api/webhooks/nowpayments`,
    order_description: orderDescription,
    order_id: stripeInvoice.id,
    price_amount: priceAmount,
    price_currency: priceCurrency,
    success_url: `${baseUrl}/dashboard/billing?payment=processing&crypto=true&invoice=${stripeInvoice.id}`,
  })

  try {
    await prisma.nowPaymentsInvoice.create({
      data: {
        hostedInvoiceUrl: npInvoice.invoice_url,
        metadata: (metadata ?? null) as Prisma.InputJsonValue,
        nowPaymentsId: String(npInvoice.id),
        priceAmount,
        priceCurrency,
        status: 'waiting',
        stripeCustomerId: stripeInvoice.customer as string,
        stripeInvoiceId: stripeInvoice.id,
        userId,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.nowPaymentsInvoice.findUnique({
        where: { stripeInvoiceId: stripeInvoice.id },
      })
      if (existing) {
        return { nowPaymentsId: existing.nowPaymentsId, url: existing.hostedInvoiceUrl }
      }
    }
    throw error
  }

  return { nowPaymentsId: String(npInvoice.id), url: npInvoice.invoice_url }
}
