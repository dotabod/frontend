import { stripe } from '@/lib/stripe-server'
import { GiftService } from '@/pages/api/stripe/services/gift-service'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    checkout: { sessions: { list: vi.fn().mockResolvedValue({ data: [] }) } },
    customers: { createBalanceTransaction: vi.fn() },
  },
}))

const tx: any = {
  user: { findUnique: vi.fn() },
  giftTransaction: { findFirst: vi.fn() },
  subscription: { updateMany: vi.fn() },
}

describe('GiftService.processGiftRefund', () => {
  it('returns early when no refund amount', async () => {
    const service = new GiftService(tx)
    const charge: any = { amount_refunded: 0 }
    await service.processGiftRefund(charge)
    expect(stripe.checkout.sessions.list).not.toHaveBeenCalled()
  })
})
