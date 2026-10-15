import { describe, expect, it, vi } from 'vitest'

import { applyGiftCredit } from '../gift-credit-service'

type Dependencies = Parameters<typeof applyGiftCredit>[1]
type Store = Dependencies['store']
type Billing = Dependencies['billing']

const periodEnd = new Date('2026-11-14T00:00:00.000Z')
const user = { email: 'recipient@dotabod.test', image: null, locale: 'en', name: 'Recipient' }

const createFakes = () => {
  const cancel = vi.fn<Billing['subscriptions']['cancel']>().mockResolvedValue({ id: 'sub_old' })
  const createSubscription = vi
    .fn<Billing['createSubscription']>()
    .mockResolvedValue({ currentPeriodEnd: periodEnd, id: 'sub_new' })
  const retrieveCustomerBalance = vi
    .fn<Billing['retrieveCustomerBalance']>()
    .mockResolvedValue(-600)
  const findCustomerId = vi.fn<Store['findCustomerId']>().mockResolvedValue('cus_looked_up')
  const findPastDueStripeSubscriptionIds = vi
    .fn<Store['findPastDueStripeSubscriptionIds']>()
    .mockResolvedValue([])
  const findReactivationPriceId = vi.fn<Store['findReactivationPriceId']>().mockResolvedValue(null)
  const findUser = vi.fn<Store['findUser']>().mockResolvedValue(user)
  const hasActiveSubscription = vi.fn<Store['hasActiveSubscription']>().mockResolvedValue(false)
  const recordSubscription = vi.fn<Store['recordSubscription']>().mockResolvedValue()

  const dependencies: Dependencies = {
    billing: { createSubscription, retrieveCustomerBalance, subscriptions: { cancel } },
    monthlyPriceId: 'price_monthly',
    store: {
      findCustomerId,
      findPastDueStripeSubscriptionIds,
      findReactivationPriceId,
      findUser,
      hasActiveSubscription,
      recordSubscription,
    },
  }

  return {
    cancel,
    createSubscription,
    dependencies,
    findCustomerId,
    findPastDueStripeSubscriptionIds,
    findReactivationPriceId,
    findUser,
    hasActiveSubscription,
    recordSubscription,
    retrieveCustomerBalance,
  }
}

type Fakes = ReturnType<typeof createFakes>

const recipient = { stripeCustomerId: 'cus_recipient', userId: 'user_1' }

describe(applyGiftCredit, () => {
  it('starts a monthly subscription that the credit balance pays for', async () => {
    const fakes = createFakes()

    const result = await applyGiftCredit(recipient, fakes.dependencies)

    expect(result).toStrictEqual({ creditApplied: 6, kind: 'applied', priceId: 'price_monthly' })
    expect(fakes.createSubscription).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ customer: 'cus_recipient', items: [{ price: 'price_monthly' }] }),
    )
    expect(fakes.recordSubscription).toHaveBeenCalledExactlyOnceWith({
      creditBalanceUsed: -600,
      currentPeriodEnd: periodEnd,
      priceId: 'price_monthly',
      stripeCustomerId: 'cus_recipient',
      stripeSubscriptionId: 'sub_new',
      userId: 'user_1',
    })
    expect(fakes.findCustomerId).not.toHaveBeenCalled()
  })

  it('looks the customer up when the caller does not know it', async () => {
    const fakes = createFakes()

    await applyGiftCredit({ stripeCustomerId: null, userId: 'user_1' }, fakes.dependencies)

    expect(fakes.retrieveCustomerBalance).toHaveBeenCalledExactlyOnceWith('cus_looked_up')
  })

  it('reuses the price of the plan the member had before', async () => {
    const fakes = createFakes()
    fakes.findReactivationPriceId.mockResolvedValue('price_previous')

    const result = await applyGiftCredit(recipient, fakes.dependencies)

    expect(result).toStrictEqual({ creditApplied: 6, kind: 'applied', priceId: 'price_previous' })
  })

  it('cancels the past due subscription the new one replaces', async () => {
    const fakes = createFakes()
    fakes.findPastDueStripeSubscriptionIds.mockResolvedValue(['sub_old'])

    await applyGiftCredit(recipient, fakes.dependencies)

    expect(fakes.cancel).toHaveBeenCalledExactlyOnceWith('sub_old', {
      invoice_now: false,
      prorate: true,
    })
  })

  it('throws before touching Stripe when no price is configured', async () => {
    const fakes = createFakes()

    await expect(
      applyGiftCredit(recipient, { ...fakes.dependencies, monthlyPriceId: null }),
    ).rejects.toThrow('Monthly PRO price ID not configured')
    expect(fakes.createSubscription).not.toHaveBeenCalled()
  })

  it('throws when the member does not exist', async () => {
    const fakes = createFakes()
    fakes.findUser.mockResolvedValue(null)

    await expect(applyGiftCredit(recipient, fakes.dependencies)).rejects.toThrow(
      'User user_1 not found',
    )
    expect(fakes.createSubscription).not.toHaveBeenCalled()
  })

  interface EarlyExit {
    configure: (fakes: Fakes) => void
    kind: string
    name: string
  }

  it.each<EarlyExit>([
    {
      configure: (fakes) => {
        fakes.hasActiveSubscription.mockResolvedValue(true)
      },
      kind: 'already-active',
      name: 'the member already has an active plan',
    },
    {
      configure: (fakes) => {
        fakes.retrieveCustomerBalance.mockResolvedValue(null)
      },
      kind: 'customer-deleted',
      name: 'the Stripe customer was deleted',
    },
  ])('leaves Stripe alone when $name', async ({ configure, kind }) => {
    const fakes = createFakes()
    configure(fakes)

    const result = await applyGiftCredit(recipient, fakes.dependencies)

    expect(result).toStrictEqual({ kind })
    expect(fakes.createSubscription).not.toHaveBeenCalled()
  })

  it('reports a member without a Stripe customer', async () => {
    const fakes = createFakes()
    fakes.findCustomerId.mockResolvedValue(null)

    const result = await applyGiftCredit(
      { stripeCustomerId: null, userId: 'user_1' },
      fakes.dependencies,
    )

    expect(result).toStrictEqual({ kind: 'no-customer' })
    expect(fakes.createSubscription).not.toHaveBeenCalled()
  })

  it('does nothing when the customer has no credit left', async () => {
    const fakes = createFakes()
    fakes.retrieveCustomerBalance.mockResolvedValue(0)

    const result = await applyGiftCredit(recipient, fakes.dependencies)

    expect(result).toStrictEqual({ balance: 0, kind: 'no-credit' })
    expect(fakes.createSubscription).not.toHaveBeenCalled()
    expect(fakes.recordSubscription).not.toHaveBeenCalled()
  })
})
