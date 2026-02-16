import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { buildCheckoutUrl, createOpenNodeCharge } from '@/lib/opennode'
import { verifyPaylinkToken } from '@/lib/paylink'
import { stripe } from '@/lib/stripe-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const invoiceId = req.query.invoiceId as string
    const token = req.query.token as string

    // Verify token
    const tokenData = verifyPaylinkToken(invoiceId, token)
    if (!tokenData) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    // Fetch and validate Stripe invoice
    const invoice = await stripe.invoices.retrieve(invoiceId)
    if (
      !invoice ||
      !['draft', 'open'].includes(invoice.status ?? '') ||
      (invoice.amount_remaining || 0) <= 0
    ) {
      res.status(400).json({ error: 'Invoice not payable' })
      return
    }

    // Check for existing OpenNode charge
    const existingCharge = await prisma.openNodeCharge.findUnique({
      where: { stripeInvoiceId: invoiceId },
    })

    if (existingCharge) {
      // Redirect to existing charge if still valid
      const checkoutUrl = buildCheckoutUrl(
        existingCharge.openNodeChargeId,
        existingCharge.hostedCheckoutUrl || undefined,
      )
      res.redirect(checkoutUrl)
      return
    }

    // Create new OpenNode charge
    const amount = (invoice.amount_remaining || 0) / 100
    const currency = (invoice.currency || 'usd').toUpperCase()

    const opendodtacharge = {
      amount,
      currency,
      description: `Invoice ${invoice.number || invoice.id}`,
      customer_email: invoice.customer_email || undefined,
      notif_email: invoice.customer_email || undefined,
      callback_url: `${process.env.NEXTAUTH_URL || 'https://dotabod.com'}/api/webhooks/opennode`,
      success_url: `${process.env.NEXTAUTH_URL || 'https://dotabod.com'}/dashboard/billing?payment=processing&crypto=true&invoice=${invoiceId}`,
      auto_settle: false, // Configure based on treasury policy
      ttl: 60, // 1 hour expiration
      metadata: {
        stripe_invoice_id: invoice.id,
        customer_id: invoice.customer,
        user_id: invoice.metadata?.userId,
      },
    }
    const charge = await createOpenNodeCharge(opendodtacharge)

    // Store charge mapping
    const opennodeData = {
      openNodeChargeId: charge.id,
      stripeInvoiceId: invoice.id || '',
      stripeCustomerId: invoice.customer as string,
      userId: invoice.metadata?.userId || '',
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      hostedCheckoutUrl: charge.hosted_checkout_url,
      metadata: charge.metadata,
    }

    await prisma.openNodeCharge.create({
      data: opennodeData,
    })

    // Redirect to OpenNode checkout
    const checkoutUrl = buildCheckoutUrl(charge.id, charge.hosted_checkout_url)
    res.redirect(checkoutUrl)
    return
  } catch (error) {
    console.error('OpenNode charge creation failed:', error)
    res.status(500).json({ error: 'Payment processing failed' })
    return
  }
}
