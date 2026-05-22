import { type PayPalOrder, SubscriptionStatus, TransactionType } from '@prisma/client'
import prisma from '@/lib/db'
import { getSubscription, type PayPalCaptureResult } from '@/lib/paypal'

function mapStatus(paypalStatus: string): SubscriptionStatus {
  switch (paypalStatus) {
    case 'ACTIVE':
      return SubscriptionStatus.ACTIVE
    case 'SUSPENDED':
      return SubscriptionStatus.PAST_DUE
    case 'CANCELLED':
    case 'EXPIRED':
      return SubscriptionStatus.CANCELED
    default:
      return SubscriptionStatus.INCOMPLETE
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
  const userId = record.userId
  const metadata = (record.metadata as Record<string, unknown>) || {}
  const priceType = (metadata.priceType as string) || 'monthly'
  const stripePriceId = (metadata.stripePriceId as string) || null
  const status = mapStatus(details.status)
  const stripeSubscriptionId = `paypal_${paypalSubscriptionId}`

  const currentPeriodEnd = details.nextBillingTime
    ? new Date(details.nextBillingTime)
    : computeFallbackPeriodEnd(priceType)

  await prisma.payPalSubscription.update({
    where: { paypalSubscriptionId },
    data: {
      status: details.status,
      payerId: details.payerId ?? record.payerId,
      lastWebhookAt: new Date(),
    },
  })

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId },
    create: {
      userId,
      stripeSubscriptionId,
      stripePriceId,
      status,
      tier: 'PRO',
      transactionType: TransactionType.RECURRING,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      metadata: {
        paymentProvider: 'paypal',
        paypalSubscriptionId,
        priceType,
      },
    },
    update: {
      status,
      stripePriceId,
      currentPeriodEnd,
      updatedAt: new Date(),
      metadata: {
        paymentProvider: 'paypal',
        paypalSubscriptionId,
        priceType,
      },
    },
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
  await prisma.payPalSubscription.updateMany({
    where: { paypalSubscriptionId },
    data: { status, lastWebhookAt: new Date() },
  })
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: `paypal_${paypalSubscriptionId}` },
    data: { status, updatedAt: new Date() },
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

  // Skip if the user already has an active lifetime purchase (idempotency).
  const existingLifetime = await prisma.subscription.findFirst({
    where: {
      userId: order.userId,
      status: SubscriptionStatus.ACTIVE,
      transactionType: TransactionType.LIFETIME,
    },
    select: { id: true },
  })

  if (!existingLifetime) {
    const farFuture = new Date()
    farFuture.setFullYear(farFuture.getFullYear() + 100)
    await prisma.subscription.create({
      data: {
        userId: order.userId,
        stripePriceId: stripePriceId || undefined,
        status: SubscriptionStatus.ACTIVE,
        tier: 'PRO',
        transactionType: TransactionType.LIFETIME,
        currentPeriodEnd: farFuture,
        cancelAtPeriodEnd: false,
        metadata: {
          paymentProvider: 'paypal',
          paypalOrderId: order.paypalOrderId,
          paypalCaptureId: capture.captureId ?? '',
        },
      },
    })
  }

  await prisma.payPalOrder.update({
    where: { paypalOrderId: order.paypalOrderId },
    data: {
      status: capture.status,
      captureId: capture.captureId ?? undefined,
      payerId: capture.payerId ?? undefined,
      lastWebhookAt: new Date(),
      metadata: { ...metadata, processedSuccessfully: true },
    },
  })
}
