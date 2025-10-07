import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getOpenNodeChargeStatus } from '@/lib/opennode'
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
    const invoice = await stripe.invoices.retrieve(invoiceId)
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
        where: { id: openNodeCharge.id },
        data: {
          status: chargeStatus.status,
          updatedAt: new Date(),
        },
      })
    }

    const currentStatus = chargeStatus?.status || openNodeCharge.status

    // Return user-friendly status information
    res.status(200).json({
      invoiceId,
      chargeId: openNodeCharge.openNodeChargeId,
      status: currentStatus,
      amount: openNodeCharge.amount,
      currency: openNodeCharge.currency,
      createdAt: openNodeCharge.createdAt,
      statusInfo: getStatusInfo(currentStatus),
      invoice: {
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount_due ? invoice.amount_due / 100 : 0,
        currency: invoice.currency,
        status: invoice.status,
      },
    })
  } catch (error) {
    console.error('Payment status check failed:', error)
    res.status(500).json({ error: 'Failed to check payment status' })
    return
  }
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'processing':
      return {
        message: 'Payment is processing on the blockchain',
        type: 'processing',
        description:
          'Your Bitcoin payment has been received and is being confirmed on the blockchain. This usually takes 10-30 minutes.',
        canRetry: false,
      }
    case 'paid':
    case 'confirmed':
      return {
        message: 'Payment completed successfully',
        type: 'success',
        description: 'Your Bitcoin payment has been confirmed and your subscription is now active.',
        canRetry: false,
      }
    case 'expired':
      return {
        message: 'Payment link has expired',
        type: 'expired',
        description: 'The payment window has expired. You can request a new payment link.',
        canRetry: true,
      }
    case 'cancelled':
      return {
        message: 'Payment was cancelled',
        type: 'cancelled',
        description: 'The payment was cancelled before completion.',
        canRetry: true,
      }
    case 'underpaid':
      return {
        message: 'Payment amount insufficient',
        type: 'error',
        description: 'The payment amount was less than required. Please contact support.',
        canRetry: false,
      }
    case 'overpaid':
      return {
        message: 'Payment amount exceeded',
        type: 'warning',
        description:
          'You paid more than required. Your subscription is active and we will process the refund.',
        canRetry: false,
      }
    case 'unpaid':
      return {
        message: 'Payment is pending',
        type: 'info',
        description: 'The payment is pending.',
        canRetry: false,
      }
    default:
      return {
        message: 'Payment status unknown',
        type: 'unknown',
        description: 'Unable to determine payment status. Please contact support if this persists.',
        canRetry: false,
      }
  }
}
