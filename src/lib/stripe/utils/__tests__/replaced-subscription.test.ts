import { beforeEach, describe, expect, it, vi } from 'vitest'

import { cancelReplacedSubscription } from '@/lib/stripe/utils/replaced-subscription'

type Cancel = Parameters<typeof cancelReplacedSubscription>[0]['cancel']

describe(cancelReplacedSubscription, () => {
  const cancel = vi.fn<Cancel>()

  beforeEach(() => {
    cancel.mockReset()
    cancel.mockResolvedValue(undefined)
  })

  it('cancels the past due subscription the new plan replaces', async () => {
    await cancelReplacedSubscription({ cancel }, 'sub_monthly_past_due', 'sub_annual')

    expect(cancel).toHaveBeenCalledExactlyOnceWith('sub_monthly_past_due', {
      invoice_now: false,
      prorate: true,
    })
  })

  it.each([
    ['there is nothing to replace', undefined],
    ['the previous subscription id is empty', ''],
    ['the previous subscription is the new one', 'sub_annual'],
    [
      'the previous subscription is a crypto record rather than a Stripe subscription',
      'crypto_cs_1',
    ],
  ])('leaves Stripe alone when %s', async (_reason, previousSubscriptionId) => {
    await cancelReplacedSubscription({ cancel }, previousSubscriptionId, 'sub_annual')

    expect(cancel).not.toHaveBeenCalled()
  })

  it('does not throw when Stripe refuses the cancel', async () => {
    cancel.mockRejectedValue(new Error('already canceled'))

    await expect(
      cancelReplacedSubscription({ cancel }, 'sub_monthly_past_due', 'sub_annual'),
    ).resolves.toBeUndefined()
    expect(cancel).toHaveBeenCalledOnce()
  })
})
