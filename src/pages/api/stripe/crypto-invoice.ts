import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { featureFlags } from '@/lib/featureFlags'
import { createAndStoreCryptoInvoice } from '@/lib/nowpayments-checkout'
import { stripe } from '@/lib/stripe-server'
import { CRYPTO_PRICE_IDS } from '@/utils/subscription'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if crypto payments feature is enabled
  if (!featureFlags.enableCryptoPayments) {
    return res.status(403).json({ error: 'Crypto payments are currently disabled' })
  }

  try {
    // Get the user session
    const session = await getServerSession(req, res, authOptions)

    // Prevent impersonation for security
    if (session?.user?.isImpersonating) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get the user's subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        NOT: {
          status: 'CANCELED',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' })
    }

    // Validate that the subscription was paid with crypto
    // Check the metadata for crypto payment flag or price ID
    const metadata = (subscription.metadata as Record<string, unknown>) || {}
    const isCryptoPayment = metadata.isCryptoPayment === 'true'
    // Safely check if stripePriceId exists and matches one of our crypto price IDs
    const hasCryptoPriceId = subscription.stripePriceId
      ? CRYPTO_PRICE_IDS.some((priceObj) =>
          [priceObj.monthly, priceObj.annual, priceObj.lifetime].includes(
            subscription.stripePriceId as string,
          ),
        )
      : false

    const isCryptoSubscription = isCryptoPayment || hasCryptoPriceId

    if (!isCryptoSubscription) {
      return res.status(400).json({ error: 'This subscription is not paid with crypto' })
    }

    // Check if this subscription was upgraded to a different plan
    if (metadata.upgradedTo) {
      return res.status(400).json({
        error: `This subscription has been upgraded to a ${metadata.upgradedTo} plan. Please use the newer subscription for payments.`,
      })
    }

    // Get the renewal invoice ID from metadata
    const renewalInvoiceId = metadata.renewalInvoiceId as string

    if (!renewalInvoiceId) {
      return res.status(404).json({ error: 'No renewal invoice found for this subscription' })
    }

    try {
      let invoice = await stripe.invoices.retrieve(renewalInvoiceId)

      if (invoice.status === 'void' || invoice.status === 'uncollectible') {
        return res.status(400).json({
          error: 'This invoice has been canceled. No payment is required.',
        })
      }

      if (invoice.status !== 'draft' && invoice.status !== 'open') {
        return res.status(400).json({
          error: `Invoice is not in a payable state. Current status: ${invoice.status}`,
        })
      }

      const existing = await prisma.nowPaymentsInvoice.findUnique({
        where: { stripeInvoiceId: renewalInvoiceId },
      })
      // Reuse only when the prior NOWPayments invoice is still payable.
      // Terminal states (failed/refunded/expired) get a fresh URL.
      const REUSABLE_STATUSES = new Set([
        'waiting',
        'confirming',
        'confirmed',
        'sending',
        'partially_paid',
      ])
      if (existing) {
        if (REUSABLE_STATUSES.has(existing.status)) {
          return res.status(200).json({ url: existing.hostedInvoiceUrl })
        }
        await prisma.nowPaymentsInvoice.delete({
          where: { stripeInvoiceId: renewalInvoiceId },
        })
      }

      if (invoice.status === 'draft') {
        invoice = await stripe.invoices.finalizeInvoice(renewalInvoiceId)
      }

      const { url } = await createAndStoreCryptoInvoice({
        stripeInvoice: invoice,
        userId: session.user.id,
        orderDescription: 'Dotabod subscription renewal',
        metadata: { renewal: true },
      })

      return res.status(200).json({ url })
    } catch (error) {
      console.error('Error processing crypto renewal invoice:', error)
      return res.status(500).json({ error: 'Failed to process invoice payment' })
    }
  } catch (error) {
    console.error('Error handling crypto invoice:', error)
    return res.status(500).json({ error: 'Failed to process request' })
  }
}
