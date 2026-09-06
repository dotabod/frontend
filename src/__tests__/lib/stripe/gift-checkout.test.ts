import { describe, expect, it } from 'vitest'

import { getGiftDuration, getGiftTextValidationError } from '@/lib/stripe/gift-checkout'

describe(getGiftDuration, () => {
  it('derives the configured gift billing period from its price ID', () => {
    expect(
      getGiftDuration('price_annual', {
        annual: 'price_annual',
        lifetime: 'price_lifetime',
      }),
    ).toBe('annual')
    expect(
      getGiftDuration('price_lifetime', {
        annual: 'price_annual',
        lifetime: 'price_lifetime',
      }),
    ).toBe('lifetime')
    expect(
      getGiftDuration('price_monthly', {
        annual: 'price_annual',
        lifetime: 'price_lifetime',
      }),
    ).toBe('monthly')
  })
})

describe(getGiftTextValidationError, () => {
  it('identifies which profane gift field must be rejected', () => {
    expect(
      getGiftTextValidationError(
        { giftMessage: 'bad', giftSenderName: 'sender' },
        (text) => text === 'bad',
      ),
    ).toBe('message')
    expect(
      getGiftTextValidationError(
        { giftMessage: 'message', giftSenderName: 'bad' },
        (text) => text === 'bad',
      ),
    ).toBe('senderName')
  })
})
