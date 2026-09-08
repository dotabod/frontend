import type { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { processEventIdempotently } from '@/lib/stripe/utils/idempotency'

describe(processEventIdempotently, () => {
  const create = vi.fn()
  const findUnique = vi.fn()
  const mockTx = {
    webhookEvent: {
      create,
      findUnique,
    },
  } as unknown as Prisma.TransactionClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VERCEL_ENV', 'production')
  })

  it('processes every non-production delivery without reading or writing a receipt', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    const processor = vi.fn().mockResolvedValue(undefined)

    await expect(
      processEventIdempotently('evt_1', 'checkout.session.completed', processor, mockTx),
    ).resolves.toStrictEqual({ kind: 'processed' })

    expect(processor).toHaveBeenCalledOnce()
    expect(findUnique).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('returns a successful duplicate without invoking the processor', async () => {
    const processedAt = new Date('2026-09-07T12:00:00.000Z')
    findUnique.mockResolvedValue({ processedAt })
    const processor = vi.fn()

    await expect(
      processEventIdempotently('evt_1', 'checkout.session.completed', processor, mockTx),
    ).resolves.toStrictEqual({ kind: 'duplicate', processedAt })

    expect(processor).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects the processor error and does not delete the receipt manually', async () => {
    const processorError = new Error('processor failed')
    findUnique.mockResolvedValue(null)
    create.mockResolvedValue({ id: 'w1' })

    await expect(
      processEventIdempotently(
        'evt_1',
        'checkout.session.completed',
        async () => {
          throw processorError
        },
        mockTx,
      ),
    ).rejects.toBe(processorError)

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripeEventId: 'evt_1' }),
      }),
    )
    expect('delete' in mockTx.webhookEvent).toBeFalsy()
  })
})
