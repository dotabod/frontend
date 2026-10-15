import { SubscriptionStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'

import { isLiveStripeSubscription } from '@/lib/stripe/live-subscription'

describe(isLiveStripeSubscription, () => {
  it.each([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE])(
    'treats a %s card subscription as live',
    (status) => {
      expect(isLiveStripeSubscription({ status, stripeSubscriptionId: 'sub_card' })).toBeTruthy()
    },
  )

  it.each([
    SubscriptionStatus.CANCELED,
    SubscriptionStatus.INCOMPLETE,
    SubscriptionStatus.INCOMPLETE_EXPIRED,
    SubscriptionStatus.PAUSED,
    SubscriptionStatus.UNPAID,
    null,
  ])('does not treat a %s card subscription as live', (status) => {
    expect(isLiveStripeSubscription({ status, stripeSubscriptionId: 'sub_card' })).toBeFalsy()
  })

  it.each([
    ['a crypto plan', 'crypto_cs_1'],
    ['a PayPal plan', 'paypal_I-123'],
    ['a lifetime or gift row without an id', null],
  ])('ignores %s', (_label, stripeSubscriptionId) => {
    expect(
      isLiveStripeSubscription({ status: SubscriptionStatus.ACTIVE, stripeSubscriptionId }),
    ).toBeFalsy()
  })
})
