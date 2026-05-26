import { type PayPalOrder, SubscriptionStatus, TransactionType } from '@prisma/client'
import prisma from '@/lib/db'
import { getSubscription, type PayPalCaptureResult } from '@/lib/paypal'

function mapStatus(paypalStatus: string): SubscriptionStatus {
  switch (paypalStatus) {
    case 'ACTIVE': {
      return SubscriptionStatus.ACTIVE
    }
    case 'SUSPENDED': {
      return SubscriptionStatus.PAST_DUE
    }
    case 'CANCELLED':
    case 'EXPIRED': {
      return SubscriptionStatus.CANCELED
    }
    default: {
      return SubscriptionStatus.INCOMPLETE
    }
  }
}

/**
 * Fetches the authoritative subscription state from PayPal and mirrors it into
 * our subscriptions table (the source of truth the apps read). No Stripe.
 */
export async function syncPaypalSubscription(paypalSubscriptionId: string): Promise<boolean> {
  const record = await prisma.payPalSubscription.findUnique({
    where: { paypalSubscriptionId },
  })
  if (!record) {
    console.warn(`No PayPalSubscription row for ${paypalSubscriptionId}`)
    return false
  }

  const details = await getSubscription(paypalSubscriptionId)
  const { userId } = record
  const metadata = (record.metadata as Record<string, unknown>) || {}
  const priceType = (metadata.priceType as string) || 'monthly'
  const stripePriceId = (metadata.stripePriceId as string) || null
  const status = mapStatus(details.status)
  const stripeSubscriptionId = `paypal_${paypalSubscriptionId}`

  const currentPeriodEnd = details.nextBillingTime
    ? new Date(details.nextBillingTime)
    : computeFallbackPeriodEnd(priceType)

  await prisma.$transaction(async (tx) => {
    await tx.payPalSubscription.update({
      data: {
        lastWebhookAt: new Date(),
        payerId: details.payerId ?? record.payerId,
        status: details.status,
      },
      where: { paypalSubscriptionId },
    })

    await tx.subscription.upsert({
      create: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd,
        metadata: {
          paymentProvider: 'paypal',
          paypalSubscriptionId,
          priceType,
        },
        status,
        stripePriceId,
        stripeSubscriptionId,
        tier: 'PRO',
        transactionType: TransactionType.RECURRING,
        userId,
      },
      update: {
        currentPeriodEnd,
        metadata: {
          paymentProvider: 'paypal',
          paypalSubscriptionId,
          priceType,
        },
        status,
        stripePriceId,
        updatedAt: new Date(),
      },
      where: { stripeSubscriptionId },
    })
  })

  return true
}

function computeFallbackPeriodEnd(priceType: string): Date {
  const end = new Date()
  if (priceType === 'annual') {
    end.setFullYear(end.getFullYear() + 1)
  } else {
    end.setMonth(end.getMonth() + 1)
  }
  return end
}

/**
 * Marks the subscriptions row for a PayPal subscription as canceled/past due
 * when PayPal reports cancellation, suspension, expiry, or a failed payment.
 */
export async function markPaypalSubscriptionInactive(
  paypalSubscriptionId: string,
  status: SubscriptionStatus,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.payPalSubscription.updateMany({
      data: { lastWebhookAt: new Date(), status },
      where: { paypalSubscriptionId },
    })
    await tx.subscription.updateMany({
      data: { status, updatedAt: new Date() },
      where: { stripeSubscriptionId: `paypal_${paypalSubscriptionId}` },
    })
  })
}

/**
 * Writes the lifetime subscriptions row for a captured one-time PayPal order.
 */
export async function completeLifetimeOrder(
  order: PayPalOrder,
  capture: PayPalCaptureResult,
): Promise<void> {
  const metadata = (order.metadata as Record<string, unknown>) || {}
  const stripePriceId = (metadata.stripePriceId as string) || null

  await prisma.$transaction(async (tx) => {
    // Skip if the user already has an active lifetime purchase (idempotency).
    const existingLifetime = await tx.subscription.findFirst({
      select: { id: true },
      where: {
        status: SubscriptionStatus.ACTIVE,
        transactionType: TransactionType.LIFETIME,
        userId: order.userId,
      },
    })

    if (!existingLifetime) {
      const farFuture = new Date()
      farFuture.setFullYear(farFuture.getFullYear() + 100)
      await tx.subscription.create({
        data: {
          cancelAtPeriodEnd: false,
          currentPeriodEnd: farFuture,
          metadata: {
            paymentProvider: 'paypal',
            paypalCaptureId: capture.captureId ?? '',
            paypalOrderId: order.paypalOrderId,
          },
          status: SubscriptionStatus.ACTIVE,
          stripePriceId: stripePriceId || undefined,
          tier: 'PRO',
          transactionType: TransactionType.LIFETIME,
          userId: order.userId,
        },
      })
    }

    await tx.payPalOrder.update({
      data: {
        captureId: capture.captureId ?? undefined,
        lastWebhookAt: new Date(),
        metadata: { ...metadata, processedSuccessfully: true },
        payerId: capture.payerId ?? undefined,
        status: capture.status,
      },
      where: { paypalOrderId: order.paypalOrderId },
    })
  })
}
