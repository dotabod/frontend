import { SubscriptionService } from '@/pages/api/stripe/services/subscription-service'
import { SubscriptionStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'

describe('SubscriptionService.mapStripeStatus', () => {
  it('maps active status', () => {
    expect(SubscriptionService.mapStripeStatus('active')).toBe(SubscriptionStatus.ACTIVE)
  })

  it('maps trialing status', () => {
    expect(SubscriptionService.mapStripeStatus('trialing')).toBe(SubscriptionStatus.TRIALING)
  })

  it('maps unknown status to canceled', () => {
    expect(SubscriptionService.mapStripeStatus('unknown')).toBe(SubscriptionStatus.CANCELED)
  })
})
