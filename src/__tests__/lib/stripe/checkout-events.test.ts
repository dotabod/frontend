import type { Prisma } from '@prisma/client'
import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleCheckoutCompleted } from '@/lib/stripe/handlers/checkout-events'

const mocks = vi.hoisted(() => ({
  stripe: {
    customers: { retrieve: vi.fn() },
    subscriptions: { cancel: vi.fn(), retrieve: vi.fn() },
  },
}))

vi.mock('@/lib/stripe-server', () => ({ stripe: mocks.stripe }))
vi.mock('@/utils/subscription', () => ({ getSubscriptionTier: () => 'PRO' }))

const tx = {
  subscription: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
} as unknown as Prisma.TransactionClient

const subscriptionCheckout = (previousSubscriptionId: string) =>
  ({
    id: 'cs_annual',
    metadata: { previousSubscriptionId, userId: 'user-1' },
    mode: 'subscription',
    subscription: 'sub_annual',
  }) as unknown as Stripe.Checkout.Session

describe(handleCheckoutCompleted, () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    mocks.stripe.customers.retrieve.mockResolvedValue({
      id: 'cus_1',
      metadata: { userId: 'user-1' },
    })
    mocks.stripe.subscriptions.retrieve.mockResolvedValue({
      cancel_at_period_end: false,
      collection_method: 'charge_automatically',
      customer: 'cus_1',
      id: 'sub_annual',
      items: { data: [{ current_period_end: 1_800_000_000, price: { id: 'price_annual' } }] },
      metadata: {},
      status: 'active',
    })
    mocks.stripe.subscriptions.cancel.mockResolvedValue({})
    vi.mocked(tx.subscription.findFirst).mockResolvedValue(null)
    vi.mocked(tx.subscription.create).mockResolvedValue({ id: 'row_annual' } as never)
  })

  it('cancels the past due subscription the new plan replaces', async () => {
    await handleCheckoutCompleted(subscriptionCheckout('sub_monthly_past_due'), tx)

    expect(tx.subscription.create).toHaveBeenCalledTimes(1)
    expect(mocks.stripe.subscriptions.cancel).toHaveBeenCalledExactlyOnceWith(
      'sub_monthly_past_due',
      { invoice_now: false, prorate: true },
    )
  })

  it.each([
    ['there is nothing to replace', ''],
    ['the previous subscription is the new one', 'sub_annual'],
    [
      'the previous subscription is a crypto record rather than a Stripe subscription',
      'crypto_cs_1',
    ],
  ])('leaves Stripe alone when %s', async (_reason, previousSubscriptionId) => {
    await handleCheckoutCompleted(subscriptionCheckout(previousSubscriptionId), tx)

    expect(mocks.stripe.subscriptions.cancel).not.toHaveBeenCalled()
  })

  it('keeps the previous subscription when the new one could not be recorded', async () => {
    mocks.stripe.customers.retrieve.mockRejectedValue(new Error('stripe unavailable'))

    await handleCheckoutCompleted(subscriptionCheckout('sub_monthly_past_due'), tx)

    expect(tx.subscription.create).not.toHaveBeenCalled()
    expect(mocks.stripe.subscriptions.cancel).not.toHaveBeenCalled()
  })

  it('still reports the checkout as handled when canceling the previous subscription fails', async () => {
    mocks.stripe.subscriptions.cancel.mockRejectedValue(new Error('already canceled'))

    await expect(
      handleCheckoutCompleted(subscriptionCheckout('sub_monthly_past_due'), tx),
    ).resolves.toBe(true)
    expect(tx.subscription.create).toHaveBeenCalledTimes(1)
  })
})
