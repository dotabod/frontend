import { describe, expect, it } from 'vitest'

import {
  isRussianLocale,
  resolvePaymentMethod,
  restoredPaymentMethod,
} from '@/components/Plan/resolve-payment-method'

const base = {
  cardsLikelyDeclined: false,
  cryptoEnabled: true,
  isProTier: true,
  paidWithCrypto: false,
  paidWithPaypal: false,
  paypalEnabled: true,
  userPicked: null,
} as const

describe(isRussianLocale, () => {
  it.each(['ru', 'ru-RU', 'RU-ru', 'ru_RU'])('treats %s as Russian', (locale) => {
    expect(isRussianLocale(locale)).toBeTruthy()
  })

  it.each(['en', 'en-US', 'uk-UA', 'rue', '', null, undefined])(
    'does not treat %s as Russian',
    (locale) => {
      expect(isRussianLocale(locale)).toBeFalsy()
    },
  )

  it('matches when any of the locales is Russian', () => {
    expect(isRussianLocale('en', 'ru-RU')).toBeTruthy()
    expect(isRussianLocale('', null)).toBeFalsy()
  })
})

describe(resolvePaymentMethod, () => {
  it('defaults to card', () => {
    expect(resolvePaymentMethod(base)).toBe('card')
  })

  it('defaults to crypto when cards are likely declined', () => {
    expect(resolvePaymentMethod({ ...base, cardsLikelyDeclined: true })).toBe('crypto')
  })

  it('keeps card when cards are likely declined but crypto is disabled', () => {
    expect(resolvePaymentMethod({ ...base, cardsLikelyDeclined: true, cryptoEnabled: false })).toBe(
      'card',
    )
  })

  it('respects an explicit card pick over the crypto default', () => {
    expect(resolvePaymentMethod({ ...base, cardsLikelyDeclined: true, userPicked: 'card' })).toBe(
      'card',
    )
  })

  it('keeps an existing PayPal subscription on PayPal', () => {
    expect(resolvePaymentMethod({ ...base, cardsLikelyDeclined: true, paidWithPaypal: true })).toBe(
      'paypal',
    )
  })

  it('uses card for tiers other than Pro', () => {
    expect(resolvePaymentMethod({ ...base, cardsLikelyDeclined: true, isProTier: false })).toBe(
      'card',
    )
  })

  it('falls back from a disabled pick to the derived method', () => {
    expect(
      resolvePaymentMethod({
        ...base,
        paidWithCrypto: true,
        paypalEnabled: false,
        userPicked: 'paypal',
      }),
    ).toBe('crypto')
  })
})

describe(restoredPaymentMethod, () => {
  it('restores the method the sign-in callback URL carried', () => {
    expect(restoredPaymentMethod({ crypto: 'true' })).toBe('crypto')
    expect(restoredPaymentMethod({ paypal: 'true' })).toBe('paypal')
  })

  it('restores card when the URL carried no method', () => {
    expect(restoredPaymentMethod({})).toBe('card')
  })
})
