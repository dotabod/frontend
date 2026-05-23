import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getOpenNodeChargeStatus } from '@/lib/opennode'
import { isOpenNodePaymentConfirmed, processConfirmedOpenNodePayment } from '@/lib/opennode-payment'
import { stripe } from '@/lib/stripe-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { invoiceId } = req.query

    if (!invoiceId || typeof invoiceId !== 'string') {
      res.status(400).json({ error: 'Invoice ID is required' })
      return
    }

    // Get Stripe invoice to verify user ownership
    let invoice = await stripe.invoices.retrieve(invoiceId)
    if (invoice.metadata?.userId !== session.user.id) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Get OpenNode charge status
    const openNodeCharge = await prisma.openNodeCharge.findUnique({
      where: { stripeInvoiceId: invoiceId },
    })

    if (!openNodeCharge) {
      res.status(404).json({ error: 'Payment not found' })
      return
    }

    // Get fresh status from OpenNode
    const chargeStatus = await getOpenNodeChargeStatus(openNodeCharge.openNodeChargeId)

    // Update local status if different
    if (chargeStatus && chargeStatus.status !== openNodeCharge.status) {
      await prisma.openNodeCharge.update({
        data: {
          status: chargeStatus.status,
          updatedAt: new Date(),
        },
        where: { id: openNodeCharge.id },
      })
    }

    const currentStatus = chargeStatus?.status || openNodeCharge.status

    if (isOpenNodePaymentConfirmed(currentStatus)) {
      try {
        await processConfirmedOpenNodePayment(
          { ...openNodeCharge, status: currentStatus },
          currentStatus,
        )
        invoice = await stripe.invoices.retrieve(invoiceId)
      } catch (error) {
        console.error('Confirmed OpenNode payment activation failed:', error)
        res.status(500).json({
          error: 'Payment confirmed, but subscription activation failed. Please contact support.',
        })
        return
      }
    }

    const invoiceAmount = ((invoice.total || invoice.amount_due || 0) as number) / 100

    // Return user-friendly status information
    res.status(200).json({
      amount: invoiceAmount || openNodeCharge.amount,
      chargeId: openNodeCharge.openNodeChargeId,
      createdAt: openNodeCharge.createdAt,
      currency: invoice.currency || openNodeCharge.currency,
      invoice: {
        amount: invoice.amount_due ? invoice.amount_due / 100 : 0,
        currency: invoice.currency,
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
      },
      invoiceId,
      status: currentStatus,
      statusInfo: getStatusInfo(currentStatus),
    })
  } catch (error) {
    console.error('Payment status check failed:', error)
    res.status(500).json({ error: 'Failed to check payment status' })
    return
  }
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'processing': {
      return {
        canRetry: false,
        description:
          'Your Bitcoin payment has been received and is being confirmed on the blockchain. This usually takes 10-30 minutes.',
        message: 'Payment is processing on the blockchain',
        type: 'processing',
      }
    }
    case 'paid':
    case 'confirmed': {
      return {
        canRetry: false,
        description: 'Your Bitcoin payment has been confirmed and your subscription is now active.',
        message: 'Payment completed successfully',
        type: 'success',
      }
    }
    case 'expired': {
      return {
        canRetry: true,
        description: 'The payment window has expired. You can request a new payment link.',
        message: 'Payment link has expired',
        type: 'expired',
      }
    }
    case 'cancelled': {
      return {
        canRetry: true,
        description: 'The payment was cancelled before completion.',
        message: 'Payment was cancelled',
        type: 'cancelled',
      }
    }
    case 'underpaid': {
      return {
        canRetry: false,
        description: 'The payment amount was less than required. Please contact support.',
        message: 'Payment amount insufficient',
        type: 'error',
      }
    }
    case 'overpaid': {
      return {
        canRetry: false,
        description:
          'You paid more than required. Your subscription is active and we will process the refund.',
        message: 'Payment amount exceeded',
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
