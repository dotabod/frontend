import { SubscriptionStatus, TransactionType } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RefundableSubscription, RefundedCharge } from '../refund-service'
import { applyChargeRefund } from '../refund-service'

type Dependencies = Parameters<typeof applyChargeRefund>[1]
type Store = Dependencies['store']
type Lookups = Dependencies['lookups']

// The Stripe customer of a user who bought lifetime and a crypto plan, and also paid by card.
const lifetimePlan: RefundableSubscription = {
  id: 'row_lifetime',
  metadata: { checkoutSessionId: 'cs_lifetime' },
  status: SubscriptionStatus.ACTIVE,
  stripeSubscriptionId: null,
  transactionType: TransactionType.LIFETIME,
}
const cryptoPlan: RefundableSubscription = {
  id: 'row_crypto',
  metadata: { checkoutSessionId: 'cs_crypto', isCryptoPayment: 'true' },
  status: SubscriptionStatus.ACTIVE,
  stripeSubscriptionId: 'crypto_cs_crypto',
  transactionType: TransactionType.RECURRING,
}
const cardPlan: RefundableSubscription = {
  id: 'row_card',
  metadata: null,
  status: SubscriptionStatus.ACTIVE,
  stripeSubscriptionId: 'sub_card',
  transactionType: TransactionType.RECURRING,
}
const secondCardPlan: RefundableSubscription = {
  ...cardPlan,
  id: 'row_card_second',
  stripeSubscriptionId: 'sub_card_second',
}
const canceledCardPlan: RefundableSubscription = {
  ...cardPlan,
  id: 'row_card_canceled',
  status: SubscriptionStatus.CANCELED,
  stripeSubscriptionId: 'sub_card_canceled',
}

const charge = (overrides: Partial<RefundedCharge> = {}): RefundedCharge => ({
  amountRefunded: 600,
  customerId: 'cus_1',
  id: 'ch_1',
  paymentIntentId: 'pi_1',
  refundId: 're_1',
  refunded: true,
  ...overrides,
})

// What Stripe reports about the payment intent of the refunded charge.
interface Evidence {
  checkoutSessionId?: string
  invoiceSubscriptionId?: string
}

const createFakes = (subscriptions: RefundableSubscription[], evidence: Evidence = {}) => {
  const findSubscriptions = vi.fn<Store['findSubscriptions']>().mockResolvedValue(subscriptions)
  const updateSubscription = vi.fn<Store['updateSubscription']>().mockResolvedValue()
  const findInvoiceSubscriptionId = vi
    .fn<Lookups['findInvoiceSubscriptionId']>()
    .mockResolvedValue(evidence.invoiceSubscriptionId ?? null)
  const findCheckoutSessionId = vi
    .fn<Lookups['findCheckoutSessionId']>()
    .mockResolvedValue(evidence.checkoutSessionId ?? null)

  const dependencies: Dependencies = {
    lookups: { findCheckoutSessionId, findInvoiceSubscriptionId },
    store: { findSubscriptions, updateSubscription },
  }

  return { dependencies, findCheckoutSessionId, findInvoiceSubscriptionId, updateSubscription }
}

type Fakes = ReturnType<typeof createFakes>

const refund = async (refundedCharge: RefundedCharge, fakes: Fakes): Promise<void> => {
  await applyChargeRefund({ charge: refundedCharge, userId: 'user_1' }, fakes.dependencies)
}

const recordedUpdates = (fakes: Fakes) =>
  fakes.updateSubscription.mock.calls.map(([id, update]) => ({ id, ...update }))

describe(applyChargeRefund, () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockReturnValue()
    vi.spyOn(console, 'error').mockReturnValue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('leaves a lifetime plan and a crypto plan alone when a card subscription charge is refunded', async () => {
    const fakes = createFakes([lifetimePlan, cryptoPlan, cardPlan], {
      invoiceSubscriptionId: 'sub_card',
    })

    await refund(charge(), fakes)

    expect(recordedUpdates(fakes)).toMatchObject([
      {
        id: 'row_card',
        metadata: { fullyRefunded: 'true', refundAmount: '600', refundId: 're_1' },
      },
    ])
    expect(recordedUpdates(fakes).at(0)).not.toHaveProperty('status')
  })

  it('records the refund only on the subscription the refunded invoice billed', async () => {
    const fakes = createFakes([cardPlan, secondCardPlan], {
      invoiceSubscriptionId: 'sub_card_second',
    })

    await refund(charge({ refunded: false }), fakes)

    expect(recordedUpdates(fakes)).toMatchObject([
      { id: 'row_card_second', metadata: { fullyRefunded: 'false' } },
    ])
  })

  it('does not touch a canceled card subscription whose invoice was refunded', async () => {
    const fakes = createFakes([lifetimePlan, canceledCardPlan], {
      invoiceSubscriptionId: 'sub_card_canceled',
    })

    await refund(charge(), fakes)

    expect(fakes.updateSubscription).not.toHaveBeenCalled()
  })

  it('cancels only the lifetime plan when its own purchase is fully refunded', async () => {
    const fakes = createFakes([lifetimePlan, cryptoPlan, cardPlan], {
      checkoutSessionId: 'cs_lifetime',
    })

    await refund(charge(), fakes)

    expect(recordedUpdates(fakes)).toMatchObject([
      {
        id: 'row_lifetime',
        metadata: { checkoutSessionId: 'cs_lifetime', refundId: 're_1' },
        status: SubscriptionStatus.CANCELED,
      },
    ])
  })

  it('annotates a partly refunded lifetime plan without canceling it', async () => {
    const fakes = createFakes([lifetimePlan, cardPlan], { checkoutSessionId: 'cs_lifetime' })

    await refund(charge({ amountRefunded: 1000, refunded: false }), fakes)

    expect(recordedUpdates(fakes)).toMatchObject([
      { id: 'row_lifetime', metadata: { refundAmount: '1000' } },
    ])
    expect(recordedUpdates(fakes).at(0)).not.toHaveProperty('status')
  })

  it('cancels only the crypto plan when its own payment is fully refunded', async () => {
    const fakes = createFakes([lifetimePlan, cryptoPlan, cardPlan], {
      checkoutSessionId: 'cs_crypto',
    })

    await refund(charge(), fakes)

    expect(recordedUpdates(fakes)).toMatchObject([
      {
        id: 'row_crypto',
        metadata: { fullyRefunded: 'true' },
        status: SubscriptionStatus.CANCELED,
      },
    ])
  })

  it('matches a plan that recorded the refunded charge id', async () => {
    const recorded: RefundableSubscription = { ...lifetimePlan, metadata: { chargeId: 'ch_1' } }
    const fakes = createFakes([recorded, cardPlan])

    await refund(charge({ paymentIntentId: null }), fakes)

    expect(recordedUpdates(fakes)).toMatchObject([
      { id: 'row_lifetime', status: SubscriptionStatus.CANCELED },
    ])
  })

  it('changes nothing and logs when the charge cannot be tied to a plan', async () => {
    const fakes = createFakes([lifetimePlan, cryptoPlan, cardPlan])

    await refund(charge(), fakes)

    expect(fakes.updateSubscription).not.toHaveBeenCalled()
    expect(vi.mocked(console.error)).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('Refund attribution failed for charge ch_1'),
    )
  })

  it('changes nothing when the refunded invoice belongs to a subscription we do not have', async () => {
    const fakes = createFakes([lifetimePlan, cardPlan], {
      checkoutSessionId: 'cs_lifetime',
      invoiceSubscriptionId: 'sub_elsewhere',
    })

    await refund(charge(), fakes)

    expect(fakes.updateSubscription).not.toHaveBeenCalled()
    expect(fakes.findCheckoutSessionId).not.toHaveBeenCalled()
  })

  it('does not guess between two plans that record the same purchase', async () => {
    const duplicate: RefundableSubscription = { ...lifetimePlan, id: 'row_lifetime_duplicate' }
    const fakes = createFakes([lifetimePlan, duplicate], { checkoutSessionId: 'cs_lifetime' })

    await refund(charge(), fakes)

    expect(fakes.updateSubscription).not.toHaveBeenCalled()
  })

  it('lets a Stripe lookup failure surface so the webhook is retried', async () => {
    const fakes = createFakes([cardPlan])
    fakes.findInvoiceSubscriptionId.mockRejectedValue(new Error('Stripe unavailable'))

    await expect(refund(charge(), fakes)).rejects.toThrow('Stripe unavailable')
    expect(fakes.updateSubscription).not.toHaveBeenCalled()
  })

  it('skips a charge that has no Stripe customer', async () => {
    const fakes = createFakes([cardPlan])

    await refund(charge({ customerId: null }), fakes)

    expect(fakes.updateSubscription).not.toHaveBeenCalled()
  })
})
