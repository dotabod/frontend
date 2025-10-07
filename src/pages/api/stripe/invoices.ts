import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe-server'
import { getSubscription } from '@/utils/subscription'
import prisma from '@/lib/db'

interface InvoiceData {
  id: string
  number: string | null
  status: string
  amount_due: number
  currency: string
  created: number
  due_date: number | null
  hosted_invoice_url: string | null
  payment_intent: {
    status?: string
  } | null
  metadata: {
    isCryptoPayment?: string
    paymentProvider?: string
  }
  opennode_charge?: {
    id: string
    status: string
    amount: number
    currency: string
    hosted_checkout_url: string | null
    created_at: Date
    last_webhook_at: Date | null
  } | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (session?.user?.isImpersonating) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get customer ID from subscription
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

    // If still no customer ID, check OpenNode charges table for stripe customer data
    if (!customerId) {
      const openNodeChargeWithCustomerId = await prisma.openNodeCharge.findFirst({
        where: {
          userId: session.user.id,
          stripeCustomerId: { not: '' },
        },
        select: { stripeCustomerId: true },
        orderBy: { createdAt: 'desc' }, // Get the most recent one
      })

      customerId = openNodeChargeWithCustomerId?.stripeCustomerId || null
    }

    if (!customerId) {
      return res.status(200).json({ invoices: [] })
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
      status: 'open', // Only get open/unpaid invoices
      expand: ['data.payment_intent'],
    })

    // Get OpenNode charges for all invoices
    const invoiceIds = invoices.data.map(invoice => invoice.id).filter((id): id is string => !!id)
    const openNodeCharges = await prisma.openNodeCharge.findMany({
      where: {
        stripeInvoiceId: { in: invoiceIds },
        userId: session.user.id,
      },
    })

    // Create a map for quick lookup
    const chargeMap = new Map(
      openNodeCharges.map(charge => [charge.stripeInvoiceId, charge])
    )

    // Format invoice data for frontend
    const formattedInvoices: InvoiceData[] = invoices.data
      .filter((invoice): invoice is typeof invoice & { id: string } => !!invoice.id)
      .map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status!,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        created: invoice.created,
        due_date: invoice.due_date,
        hosted_invoice_url: invoice.hosted_invoice_url || null,
        payment_intent: null, // Stripe's payment_intent is not always expanded properly
        metadata: {
          isCryptoPayment: invoice.metadata?.isCryptoPayment,
          paymentProvider: invoice.metadata?.paymentProvider,
        },
        opennode_charge: chargeMap.has(invoice.id) ? {
          id: chargeMap.get(invoice.id)!.openNodeChargeId,
          status: chargeMap.get(invoice.id)!.status,
          amount: chargeMap.get(invoice.id)!.amount,
          currency: chargeMap.get(invoice.id)!.currency,
          hosted_checkout_url: chargeMap.get(invoice.id)!.hostedCheckoutUrl,
          created_at: chargeMap.get(invoice.id)!.createdAt,
          last_webhook_at: chargeMap.get(invoice.id)!.lastWebhookAt,
        } : null,
      }))

    return res.status(200).json({ invoices: formattedInvoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return res.status(500).json({ error: 'Failed to fetch invoices' })
  }
}
