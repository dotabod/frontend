import { describe, expect, it } from 'vitest'

import { getSafeStripeCheckoutUrl } from '@/lib/stripe/checkout-redirect'

describe(getSafeStripeCheckoutUrl, () => {
  it('accepts Stripe-hosted HTTPS checkout URLs', () => {
    expect(getSafeStripeCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_123')).toBe(
      'https://checkout.stripe.com/c/pay/cs_test_123',
    )
  })

  it('rejects an attacker-controlled redirect URL', () => {
    expect(getSafeStripeCheckoutUrl('https://attacker.example/checkout')).toBeUndefined()
    expect(
      getSafeStripeCheckoutUrl('https://checkout.stripe.com.attacker.example/'),
    ).toBeUndefined()
    expect(getSafeStripeCheckoutUrl('https://checkout.stripe.com:444/')).toBeUndefined()
  })
})
