import { describe, expect, it } from 'vitest'

import { giftTextSchema } from '@/lib/stripe/gift-checkout-request'

describe('gift checkout request validation', () => {
  it('rejects nested HTML markup in a gift message', () => {
    const result = giftTextSchema.safeParse('<scr<script>ipt>alert(1)</script>')

    expect(result.success).toBeFalsy()
  })

  it('allows ordinary Unicode gift text', () => {
    const result = giftTextSchema.safeParse('Congrats, you earned $10 & a 🎉!')

    expect(result.success).toBeTruthy()
  })
})
