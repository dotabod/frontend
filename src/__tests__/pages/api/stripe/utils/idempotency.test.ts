import { beforeEach, describe, expect, it, vi } from 'vitest'
import { processEventIdempotently } from '@/pages/api/stripe/utils/idempotency'

describe('processEventIdempotently', () => {
  const mockTx = {
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VERCEL_ENV', 'production')
  })

  it('deletes idempotency record when processing fails so retries are possible', async () => {
    mockTx.webhookEvent.findUnique.mockResolvedValue(null)
    mockTx.webhookEvent.create.mockResolvedValue({ id: 'w1' })
    mockTx.webhookEvent.delete.mockResolvedValue({ id: 'w1' })

    const result = await processEventIdempotently(
      'evt_1',
      'checkout.session.completed',
      async () => {
        throw new Error('processor failed')
      },
      mockTx as any,
    )

    expect(result).toBe(false)
    expect(mockTx.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        stripeEventId: 'evt_1',
        eventType: 'checkout.session.completed',
        processedAt: expect.any(Date),
      },
    })
    expect(mockTx.webhookEvent.delete).toHaveBeenCalledWith({
      where: { stripeEventId: 'evt_1' },
    })
  })
})
