// @ts-nocheck
import type { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { processEventIdempotently } from '@/lib/stripe/utils/idempotency'

describe('processEventIdempotently', () => {
  const mockTx: Pick<Prisma.TransactionClient, 'webhookEvent'> = {
    webhookEvent: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
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
      mockTx,
    )

    expect(result).toBe(false)
    expect(mockTx.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'checkout.session.completed',
        processedAt: expect.any(Date),
        stripeEventId: 'evt_1',
      },
    })
    expect(mockTx.webhookEvent.delete).toHaveBeenCalledWith({
      where: { stripeEventId: 'evt_1' },
    })
  })
})
