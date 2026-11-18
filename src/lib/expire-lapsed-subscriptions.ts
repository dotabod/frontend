import { SubscriptionStatus, TransactionType } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { captureException } from '@sentry/nextjs'

import prisma from '@/lib/db'
import { syncPaypalSubscription } from '@/lib/paypal-subscriptions'

// A crypto renewal invoice falls due at currentPeriodEnd. Three more days cover slow
// Confirmations and Stripe's webhook retries before access ends.
const GRACE_MS = 3 * 24 * 60 * 60 * 1000
const BATCH_SIZE = 50
const PAYPAL_PREFIX = 'paypal_'
const ACTIVE_STATUSES = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]

interface LapsedSubscription {
  id: string
  metadata: Prisma.JsonValue
  stripeSubscriptionId: string | null
}

interface ExpireLapsedStore {
  findLapsed: (endedBefore: Date, limit: number) => Promise<LapsedSubscription[]>
  // Resolves false when the row was renewed or changed since it was read.
  expire: (subscription: LapsedSubscription, endedBefore: Date, expiredAt: Date) => Promise<boolean>
}

interface ExpireLapsedDependencies {
  now: () => Date
  reportFailure: (subscription: LapsedSubscription, error: Error) => void
  store: ExpireLapsedStore
  syncPaypal: (paypalSubscriptionId: string) => Promise<boolean>
}

interface ExpireLapsedSummary {
  checked: number
  expired: number
  failed: number
  resynced: number
  unchanged: number
}

const toMetadataObject = function toMetadataObject(metadata: Prisma.JsonValue): Prisma.JsonObject {
  return metadata instanceof Object && !Array.isArray(metadata) ? metadata : {}
}

const defaultDependencies: ExpireLapsedDependencies = {
  now: () => new Date(),
  reportFailure: (subscription, error) => {
    console.error(`Expiring lapsed subscription ${subscription.id} failed:`, error)
    captureException(error, { extra: { subscriptionId: subscription.id } })
  },
  store: {
    expire: async (subscription, endedBefore, expiredAt) => {
      const { count } = await prisma.subscription.updateMany({
        data: {
          metadata: {
            ...toMetadataObject(subscription.metadata),
            canceledAt: expiredAt.toISOString(),
            cancellationReason: 'period_lapsed',
          },
          status: SubscriptionStatus.CANCELED,
          updatedAt: expiredAt,
        },
        where: {
          currentPeriodEnd: { lt: endedBefore },
          id: subscription.id,
          status: { in: ACTIVE_STATUSES },
        },
      })
      return count === 1
    },
    findLapsed: async (endedBefore, limit) =>
      await prisma.subscription.findMany({
        orderBy: { currentPeriodEnd: 'asc' },
        select: { id: true, metadata: true, stripeSubscriptionId: true },
        take: limit,
        where: {
          OR: [
            { stripeSubscriptionId: { startsWith: 'crypto_' } },
            { stripeSubscriptionId: { startsWith: PAYPAL_PREFIX } },
          ],
          currentPeriodEnd: { lt: endedBefore },
          status: { in: ACTIVE_STATUSES },
          transactionType: TransactionType.RECURRING,
        },
      }),
  },
  syncPaypal: syncPaypalSubscription,
}

const settleSubscription = async function settleSubscription(
  subscription: LapsedSubscription,
  endedBefore: Date,
  expiredAt: Date,
  dependencies: ExpireLapsedDependencies,
): Promise<'expired' | 'resynced' | 'unchanged'> {
  const id = subscription.stripeSubscriptionId ?? ''
  // PayPal bills on its own schedule, so a stale row usually means a missed webhook.
  // Its API decides; only a row with nothing left to sync from is expired here.
  if (
    id.startsWith(PAYPAL_PREFIX) &&
    (await dependencies.syncPaypal(id.slice(PAYPAL_PREFIX.length)))
  ) {
    return 'resynced'
  }

  return (await dependencies.store.expire(subscription, endedBefore, expiredAt))
    ? 'expired'
    : 'unchanged'
}

/**
 * Ends crypto and PayPal subscriptions whose paid period ran out. Stripe ends its own
 * subscriptions, but these are created ACTIVE with an end date and only a paid renewal moves
 * that date, so an unpaid one kept Pro indefinitely. A late crypto payment still reactivates
 * the row: the invoice handler finds it by renewalInvoiceId whatever its status.
 */
export const expireLapsedSubscriptions = async function expireLapsedSubscriptions(
  dependencies: ExpireLapsedDependencies = defaultDependencies,
): Promise<ExpireLapsedSummary> {
  const expiredAt = dependencies.now()
  const endedBefore = new Date(expiredAt.getTime() - GRACE_MS)
  const lapsed = await dependencies.store.findLapsed(endedBefore, BATCH_SIZE)

  const results = await Promise.allSettled(
    lapsed.map(
      async (subscription) =>
        await settleSubscription(subscription, endedBefore, expiredAt, dependencies),
    ),
  )

  const summary: ExpireLapsedSummary = {
    checked: lapsed.length,
    expired: 0,
    failed: 0,
    resynced: 0,
    unchanged: 0,
  }
  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      summary[result.value] += 1
    } else {
      summary.failed += 1
      const subscription = lapsed[index]
      if (subscription !== undefined) {
        dependencies.reportFailure(
          subscription,
          result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        )
      }
    }
  }

  console.log(JSON.stringify({ event: 'expire_lapsed_subscriptions', ...summary }))
  return summary
}
