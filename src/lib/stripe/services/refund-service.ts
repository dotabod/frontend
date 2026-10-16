import type { Prisma } from '@prisma/client'
import { SubscriptionStatus, TransactionType } from '@prisma/client'
import { z } from 'zod'

export interface RefundedCharge {
  amountRefunded: number
  customerId: string | null
  id: string
  paymentIntentId: string | null
  refundId: string | null
  refunded: boolean
}

export interface RefundableSubscription {
  id: string
  metadata: Prisma.JsonValue
  status: SubscriptionStatus | null
  stripeSubscriptionId: string | null
  transactionType: TransactionType
}

interface SubscriptionUpdate {
  metadata: Prisma.InputJsonObject
  status?: SubscriptionStatus
}

interface RefundStore {
  findSubscriptions: (userId: string, customerId: string) => Promise<RefundableSubscription[]>
  updateSubscription: (id: string, update: SubscriptionUpdate) => Promise<void>
}

interface RefundLookups {
  findCheckoutSessionId: (paymentIntentId: string) => Promise<string | null>
  findInvoiceSubscriptionId: (paymentIntentId: string) => Promise<string | null>
}

export interface RefundDependencies {
  lookups: RefundLookups
  store: RefundStore
}

// Lifetime and crypto purchases record the Stripe ids of the payment that bought them.
const recordedPurchaseSchema = z.object({
  chargeId: z.string().optional(),
  checkoutSessionId: z.string().optional(),
  isCryptoPayment: z.string().optional(),
  paymentIntentId: z.string().optional(),
})

const readRecordedPurchase = function readRecordedPurchase(
  subscription: RefundableSubscription,
): z.infer<typeof recordedPurchaseSchema> {
  const parsed = recordedPurchaseSchema.safeParse(subscription.metadata)
  return parsed.success ? parsed.data : {}
}

const metadataOf = function metadataOf(subscription: RefundableSubscription): Prisma.JsonObject {
  const { metadata } = subscription
  return metadata instanceof Object && !Array.isArray(metadata) ? metadata : {}
}

const recordsPayment = function recordsPayment(
  recorded: z.infer<typeof recordedPurchaseSchema>,
  charge: RefundedCharge,
): boolean {
  return (
    recorded.chargeId === charge.id ||
    (charge.paymentIntentId !== null && recorded.paymentIntentId === charge.paymentIntentId)
  )
}

const recordsCheckoutSession = function recordsCheckoutSession(
  subscription: RefundableSubscription,
  recorded: z.infer<typeof recordedPurchaseSchema>,
  checkoutSessionId: string | null,
): boolean {
  return (
    checkoutSessionId !== null &&
    (recorded.checkoutSessionId === checkoutSessionId ||
      subscription.stripeSubscriptionId === `crypto_${checkoutSessionId}`)
  )
}

const recordsOneTimePurchase = function recordsOneTimePurchase(
  subscription: RefundableSubscription,
  charge: RefundedCharge,
  checkoutSessionId: string | null,
): boolean {
  const recorded = readRecordedPurchase(subscription)
  return (
    recordsPayment(recorded, charge) ||
    recordsCheckoutSession(subscription, recorded, checkoutSessionId)
  )
}

// A charge belongs to the subscription its invoice bills, or to the one-time purchase whose checkout
// Session or payment it was. Anything else on the same Stripe customer is a different plan.
const findRefundedSubscription = async function findRefundedSubscription(
  charge: RefundedCharge,
  subscriptions: RefundableSubscription[],
  lookups: RefundLookups,
): Promise<RefundableSubscription | null> {
  const { paymentIntentId } = charge

  if (paymentIntentId !== null) {
    const invoiceSubscriptionId = await lookups.findInvoiceSubscriptionId(paymentIntentId)
    if (invoiceSubscriptionId !== null) {
      return (
        subscriptions.find(
          (subscription) => subscription.stripeSubscriptionId === invoiceSubscriptionId,
        ) ?? null
      )
    }
  }

  const checkoutSessionId =
    paymentIntentId === null ? null : await lookups.findCheckoutSessionId(paymentIntentId)
  const [match, ...others] = subscriptions.filter((subscription) =>
    recordsOneTimePurchase(subscription, charge, checkoutSessionId),
  )

  return match !== undefined && others.length === 0 ? match : null
}

const buildRefundUpdate = function buildRefundUpdate(
  subscription: RefundableSubscription,
  charge: RefundedCharge,
): SubscriptionUpdate | null {
  const metadata = metadataOf(subscription)
  const refundAmount = charge.amountRefunded > 0 ? charge.amountRefunded.toString() : null
  const now = new Date().toISOString()

  // Lifetime purchases are canceled by a full refund and only annotated by a partial one.
  if (subscription.transactionType === TransactionType.LIFETIME) {
    if (charge.refunded) {
      return {
        metadata: { ...metadata, refundAmount, refundId: charge.refundId, refundedAt: now },
        status: SubscriptionStatus.CANCELED,
      }
    }
    return charge.amountRefunded > 0
      ? {
          metadata: {
            ...metadata,
            partiallyRefundedAt: now,
            refundAmount,
            refundId: charge.refundId,
          },
        }
      : null
  }

  // Crypto plans have no Stripe subscription webhook to end them, so a full refund cancels them here.
  if (readRecordedPurchase(subscription).isCryptoPayment === 'true' && charge.refunded) {
    return {
      metadata: {
        ...metadata,
        fullyRefunded: 'true',
        refundAmount,
        refundId: charge.refundId,
        refundedAt: now,
      },
      status: SubscriptionStatus.CANCELED,
    }
  }

  // Recurring plans only record the refund. Stripe's subscription webhooks change their status.
  return subscription.status === SubscriptionStatus.CANCELED
    ? null
    : {
        metadata: {
          ...metadata,
          fullyRefunded: charge.refunded ? 'true' : 'false',
          refundAmount,
          refundId: charge.refundId,
          refundRecorded: now,
        },
      }
}

export const applyChargeRefund = async function applyChargeRefund(
  input: { charge: RefundedCharge; userId: string },
  { lookups, store }: RefundDependencies,
): Promise<void> {
  const { charge, userId } = input

  if (charge.customerId === null) {
    console.log(`Skipping refund for charge ${charge.id}: it has no Stripe customer`)
    return
  }

  const subscriptions = await store.findSubscriptions(userId, charge.customerId)
  if (subscriptions.length === 0) {
    console.log(`No subscriptions found for user ${userId} with customer ${charge.customerId}`)
    return
  }

  const refunded = await findRefundedSubscription(charge, subscriptions, lookups)
  if (refunded === null) {
    const paymentIntent = charge.paymentIntentId ?? 'none'
    console.error(
      `Refund attribution failed for charge ${charge.id} (payment intent ${paymentIntent}); none of user ${userId}'s ${subscriptions.length} subscriptions was changed`,
    )
    return
  }

  const update = buildRefundUpdate(refunded, charge)
  if (update === null) {
    console.log(`Charge ${charge.id} needs no change to subscription ${refunded.id}`)
    return
  }

  await store.updateSubscription(refunded.id, update)
  console.log(`Recorded the refund of charge ${charge.id} on subscription ${refunded.id}`)
}
