import { SubscriptionStatus, TransactionType } from '@prisma/client'
import type Stripe from 'stripe'

import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'

import { cancelReplacedSubscription } from '../utils/replaced-subscription'
import type { SubscriptionCanceler } from '../utils/replaced-subscription'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

interface GiftCreditUser {
  email: string | null
  image: string | null
  locale: string | null
  name: string | null
}

interface AppliedGiftSubscription {
  creditBalanceUsed: number
  currentPeriodEnd: Date
  priceId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  userId: string
}

interface GiftCreditStore {
  findCustomerId: (userId: string) => Promise<string | null>
  findPastDueStripeSubscriptionIds: (userId: string) => Promise<string[]>
  findReactivationPriceId: (userId: string) => Promise<string | null>
  findUser: (userId: string) => Promise<GiftCreditUser | null>
  hasActiveSubscription: (userId: string) => Promise<boolean>
  recordSubscription: (subscription: AppliedGiftSubscription) => Promise<void>
}

interface GiftCreditBilling {
  createSubscription: (
    params: Stripe.SubscriptionCreateParams,
  ) => Promise<{ currentPeriodEnd: Date | null; id: string }>
  retrieveCustomerBalance: (customerId: string) => Promise<number | null>
  subscriptions: SubscriptionCanceler
}

export interface GiftCreditDependencies {
  billing: GiftCreditBilling
  monthlyPriceId: string | null
  store: GiftCreditStore
}

export interface GiftCreditInput {
  // Known to the gift webhook before anything is committed, so it is passed along instead of being
  // Read back from a subscription row the webhook transaction may not have committed yet.
  stripeCustomerId: string | null
  userId: string
}

export type GiftCreditResult =
  | { creditApplied: number; kind: 'applied'; priceId: string }
  | { balance: number; kind: 'no-credit' }
  | { kind: 'already-active' | 'customer-deleted' | 'no-customer' }

/**
 * Turns a recipient's Stripe credit balance into a Pro subscription. Stripe applies the balance
 * to the new subscription's first invoice, so a gifted month needs no payment method.
 */
export const applyGiftCredit = async function applyGiftCredit(
  input: GiftCreditInput,
  dependencies: GiftCreditDependencies,
): Promise<GiftCreditResult> {
  const { billing, monthlyPriceId, store } = dependencies
  const { userId } = input

  if (await store.hasActiveSubscription(userId)) {
    return { kind: 'already-active' }
  }

  const user = await store.findUser(userId)
  if (user === null) {
    throw new Error(`User ${userId} not found`)
  }

  const customerId = input.stripeCustomerId ?? (await store.findCustomerId(userId))
  if (customerId === null) {
    return { kind: 'no-customer' }
  }

  const balance = await billing.retrieveCustomerBalance(customerId)
  if (balance === null) {
    return { kind: 'customer-deleted' }
  }
  if (balance >= 0) {
    return { balance, kind: 'no-credit' }
  }

  const priceId = (await store.findReactivationPriceId(userId)) ?? monthlyPriceId
  if (priceId === null || priceId === '') {
    throw new Error('Monthly PRO price ID not configured')
  }

  // A past due subscription keeps retrying its failed invoice, which charges the card on file, so
  // It is canceled once the subscription that replaces it exists.
  const [created, pastDueIds] = await Promise.all([
    billing.createSubscription({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        email: user.email ?? '',
        image: user.image ?? '',
        isAutoApplied: 'true',
        isCryptoPayment: 'false',
        isGift: 'false',
        isNewSubscription: 'true',
        isUpgradeToLifetime: 'false',
        locale: user.locale ?? '',
        name: user.name ?? '',
        userId,
      },
    }),
    store.findPastDueStripeSubscriptionIds(userId),
  ])
  await Promise.all(
    pastDueIds.map(async (pastDueId) => {
      await cancelReplacedSubscription(billing.subscriptions, pastDueId, created.id)
    }),
  )

  await store.recordSubscription({
    creditBalanceUsed: balance,
    currentPeriodEnd: created.currentPeriodEnd ?? new Date(Date.now() + THIRTY_DAYS_MS),
    priceId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: created.id,
    userId,
  })

  return { creditApplied: Math.abs(balance) / 100, kind: 'applied', priceId }
}

export const createGiftCreditDependencies =
  function createGiftCreditDependencies(): GiftCreditDependencies {
    return {
      billing: {
        createSubscription: async (params) => {
          const subscription = await stripe.subscriptions.create(params)
          const periodEnd = subscription.items.data[0]?.current_period_end
          return {
            currentPeriodEnd: periodEnd === undefined ? null : new Date(periodEnd * 1000),
            id: subscription.id,
          }
        },
        retrieveCustomerBalance: async (customerId) => {
          const customer = await stripe.customers.retrieve(customerId)
          return customer.deleted === true ? null : customer.balance
        },
        subscriptions: {
          cancel: async (subscriptionId, params) =>
            await stripe.subscriptions.cancel(subscriptionId, params),
        },
      },
      monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? null,
      store: {
        findCustomerId: async (userId) => {
          const latest = await prisma.subscription.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { stripeCustomerId: true },
            where: { userId },
          })
          return latest?.stripeCustomerId ?? null
        },
        findPastDueStripeSubscriptionIds: async (userId) => {
          const pastDue = await prisma.subscription.findMany({
            select: { stripeSubscriptionId: true },
            where: {
              status: SubscriptionStatus.PAST_DUE,
              stripeSubscriptionId: { not: null },
              userId,
            },
          })
          return pastDue.flatMap(({ stripeSubscriptionId }) =>
            stripeSubscriptionId === null ? [] : [stripeSubscriptionId],
          )
        },
        findReactivationPriceId: async (userId) => {
          const previous = await prisma.subscription.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { stripePriceId: true },
            where: {
              cancelAtPeriodEnd: true,
              status: {
                in: [
                  SubscriptionStatus.CANCELED,
                  SubscriptionStatus.PAST_DUE,
                  SubscriptionStatus.INCOMPLETE,
                  SubscriptionStatus.UNPAID,
                ],
              },
              stripeSubscriptionId: { not: null },
              userId,
            },
          })
          const priceId = previous?.stripePriceId ?? null
          return priceId === '' ? null : priceId
        },
        findUser: async (userId) =>
          await prisma.user.findUnique({
            select: { email: true, image: true, locale: true, name: true },
            where: { id: userId },
          }),
        hasActiveSubscription: async (userId) => {
          const active = await prisma.subscription.findFirst({
            select: { id: true },
            where: {
              isGift: false,
              status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
              userId,
            },
          })
          return active !== null
        },
        // Stripe's subscription webhook can land first, so an existing row is left as it is.
        recordSubscription: async (subscription) => {
          await prisma.subscription.upsert({
            create: {
              cancelAtPeriodEnd: false,
              currentPeriodEnd: subscription.currentPeriodEnd,
              isGift: false,
              metadata: {
                appliedAt: new Date().toISOString(),
                autoApplied: 'true',
                creditBalanceUsed: subscription.creditBalanceUsed.toString(),
                source: 'gift-credit-auto-apply',
              },
              status: SubscriptionStatus.ACTIVE,
              stripeCustomerId: subscription.stripeCustomerId,
              stripePriceId: subscription.priceId,
              stripeSubscriptionId: subscription.stripeSubscriptionId,
              tier: 'PRO',
              transactionType: TransactionType.RECURRING,
              userId: subscription.userId,
            },
            update: {},
            where: { stripeSubscriptionId: subscription.stripeSubscriptionId },
          })
        },
      },
    }
  }
