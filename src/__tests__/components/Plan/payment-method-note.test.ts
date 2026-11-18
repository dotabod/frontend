import { describe, expect, it } from 'vitest'

import { noteFor } from '@/components/Plan/payment-method-note'

describe(noteFor, () => {
  it('warns that Russian cards are declined when card is selected', () => {
    expect(noteFor('card', 'monthly', true)).toMatch(/Cards issued in Russia are usually declined/u)
    expect(noteFor('card', 'lifetime', true)).toMatch(
      /Cards issued in Russia are usually declined/u,
    )
  })

  it('keeps the usual card note without the warning', () => {
    expect(noteFor('card', 'monthly', false)).toBe('Renews automatically. Cancel anytime.')
  })

  it('leaves the crypto and PayPal notes alone when the warning is on', () => {
    expect(noteFor('crypto', 'monthly', true)).toMatch(/invoice each period/u)
    expect(noteFor('paypal', 'monthly', true)).toMatch(/PayPal account/u)
  })
})
