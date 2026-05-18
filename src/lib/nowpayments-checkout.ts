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
  if (!stripeInvoice.id) throw new Error('Stripe invoice has no id')

  const amountRemaining = stripeInvoice.amount_remaining ?? 0
  if (amountRemaining <= 0) throw new Error('Stripe invoice has no balance due')

  const priceAmount = amountRemaining / 100
  const priceCurrency = (stripeInvoice.currency || 'usd').toLowerCase()
  const baseUrl = process.env.NEXTAUTH_URL || 'https://dotabod.com'

  const npInvoice = await createNowPaymentsInvoice({
    price_amount: priceAmount,
    price_currency: priceCurrency,
    ipn_callback_url: `${baseUrl}/api/webhooks/nowpayments`,
    order_id: stripeInvoice.id,
    order_description: orderDescription,
    success_url: `${baseUrl}/dashboard/billing?payment=processing&crypto=true&invoice=${stripeInvoice.id}`,
    cancel_url: `${baseUrl}/dashboard/billing?paid=false`,
  })

  try {
    await prisma.nowPaymentsInvoice.create({
      data: {
        nowPaymentsId: String(npInvoice.id),
        stripeInvoiceId: stripeInvoice.id,
        stripeCustomerId: stripeInvoice.customer as string,
        userId,
        priceAmount,
        priceCurrency,
        status: 'waiting',
        hostedInvoiceUrl: npInvoice.invoice_url,
        metadata: (metadata ?? null) as Prisma.InputJsonValue,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.nowPaymentsInvoice.findUnique({
        where: { stripeInvoiceId: stripeInvoice.id },
      })
      if (existing) {
        return { url: existing.hostedInvoiceUrl, nowPaymentsId: existing.nowPaymentsId }
      }
    }
    throw error
  }

  return { url: npInvoice.invoice_url, nowPaymentsId: String(npInvoice.id) }
}
