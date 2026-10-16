import type { NowPaymentsInvoice } from '@prisma/client'
import type { NextApiResponse } from 'next'
import type Stripe from 'stripe'

import prisma from '@/lib/db'
import { hasCryptoInvoiceBeenCredited } from '@/lib/stripe/utils/crypto-invoice-credit'

interface NowPaymentsStatusInfo {
  canRetry: boolean
  description: string
  message: string
  type: string
}

type StatusInvoice = Pick<Stripe.Invoice, 'amount_due' | 'currency' | 'id' | 'number' | 'status'>

interface NowPaymentsStatusStore {
  findInvoice: (stripeInvoiceId: string) => Promise<NowPaymentsInvoice | null>
  hasBeenCredited: (stripeInvoiceId: string) => Promise<boolean>
}

const defaultStore: NowPaymentsStatusStore = {
  findInvoice: async (stripeInvoiceId) =>
    await prisma.nowPaymentsInvoice.findUnique({ where: { stripeInvoiceId } }),
  hasBeenCredited: async (stripeInvoiceId) =>
    await hasCryptoInvoiceBeenCredited(prisma, stripeInvoiceId),
}

const describeStatus = function describeStatus(
  status: string,
  credited: boolean,
): NowPaymentsStatusInfo {
  switch (status) {
    case 'waiting': {
      return {
        canRetry: false,
        description:
          'We have not received your payment yet. If you just paid, it can take a few minutes to show up here.',
        message: 'Waiting for your payment',
        type: 'processing',
      }
    }
    case 'confirming':
    case 'confirmed':
    case 'sending': {
      return {
        canRetry: false,
        description:
          'Your payment has been received and is being confirmed on the blockchain. This usually takes 10 to 30 minutes.',
        message: 'Payment is processing on the blockchain',
        type: 'processing',
      }
    }
    case 'finished': {
      return credited
        ? {
            canRetry: false,
            description:
              'Your crypto payment has been confirmed and your subscription is now active.',
            message: 'Payment completed successfully',
            type: 'success',
          }
        : {
            canRetry: false,
            description:
              'Your crypto payment was confirmed, but your subscription has not been activated yet. Contact support with the invoice number below and we will sort it out.',
            message: 'Payment received, activation needs attention',
            type: 'warning',
          }
    }
    case 'partially_paid': {
      return {
        canRetry: false,
        description:
          'We received only part of the amount due. Contact support with the invoice number below so we can finish it with you.',
        message: 'Payment amount insufficient',
        type: 'error',
      }
    }
    case 'failed': {
      return {
        canRetry: false,
        description:
          'The payment did not go through. Start a new checkout from the billing page to try again.',
        message: 'Payment failed',
        type: 'error',
      }
    }
    case 'expired': {
      return {
        canRetry: false,
        description:
          'The payment window has expired. Start a new checkout from the billing page to try again.',
        message: 'Payment link has expired',
        type: 'expired',
      }
    }
    case 'refunded': {
      return {
        canRetry: false,
        description: 'This payment was refunded.',
        message: 'Payment was refunded',
        type: 'warning',
      }
    }
    default: {
      return {
        canRetry: false,
        description: 'Unable to determine payment status. Please contact support if this persists.',
        message: 'Payment status unknown',
        type: 'unknown',
      }
    }
  }
}

/**
 * Answers the billing page's status poll for a NOWPayments invoice, in the same shape the OpenNode
 * branch of /api/payment-status uses. The return URL carries the Stripe invoice id, which is also
 * the key of our nowpayments_invoices row. A finished payment only counts as active once the
 * subscription it should have created exists.
 */
export const sendNowPaymentsStatus = async function sendNowPaymentsStatus(
  res: NextApiResponse,
  invoiceId: string,
  invoice: StatusInvoice,
  store: NowPaymentsStatusStore = defaultStore,
): Promise<void> {
  const nowPaymentsInvoice = await store.findInvoice(invoiceId)
  if (nowPaymentsInvoice === null) {
    res.status(404).json({ error: 'Payment not found' })
    return
  }

  const credited = await store.hasBeenCredited(invoiceId)

  res.status(200).json({
    amount: nowPaymentsInvoice.priceAmount,
    chargeId: nowPaymentsInvoice.nowPaymentsId,
    createdAt: nowPaymentsInvoice.createdAt,
    currency: nowPaymentsInvoice.priceCurrency,
    invoice: {
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
    },
    invoiceId,
    status: nowPaymentsInvoice.status,
    statusInfo: describeStatus(nowPaymentsInvoice.status, credited),
  })
}
