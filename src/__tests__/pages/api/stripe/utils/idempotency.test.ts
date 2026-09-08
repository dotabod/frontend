import type { Prisma } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { processEventIdempotently } from '@/lib/stripe/utils/idempotency'

describe(processEventIdempotently, () => {
  const tx = new PrismaClient()
  const create = vi.spyOn(tx.webhookEvent, 'create')
  const remove = vi.spyOn(tx.webhookEvent, 'delete')
  const findUnique = vi.spyOn(tx.webhookEvent, 'findUnique')
  const receipt = {
    eventType: 'checkout.session.completed',
    id: 'receipt-1',
    processedAt: new Date('2026-09-07T12:00:00.000Z'),
    stripeEventId: 'evt_1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VERCEL_ENV', 'production')
    create.mockResolvedValue(receipt)
    remove.mockResolvedValue(receipt)
    findUnique.mockResolvedValue(null)
  })

  afterAll(async () => {
    await tx.$disconnect()
  })

  it('processes every non-production delivery without reading or writing a receipt', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    const processor = vi
      .fn<(transaction: Prisma.TransactionClient) => Promise<void>>()
      .mockResolvedValue()

    await expect(
      processEventIdempotently('evt_1', 'checkout.session.completed', processor, tx),
    ).resolves.toStrictEqual({ kind: 'processed' })

    expect(processor).toHaveBeenCalledOnce()
    expect(findUnique).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('returns a successful duplicate without invoking the processor', async () => {
    findUnique.mockResolvedValue(receipt)
    const processor = vi.fn<(transaction: Prisma.TransactionClient) => Promise<void>>()

    await expect(
      processEventIdempotently('evt_1', 'checkout.session.completed', processor, tx),
    ).resolves.toStrictEqual({ kind: 'duplicate', processedAt: receipt.processedAt })

    expect(processor).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects the processor error and does not delete the receipt manually', async () => {
    const processorError = new Error('processor failed')

    await expect(
      processEventIdempotently(
        'evt_1',
        'checkout.session.completed',
        async () => {
          await Promise.resolve()
          throw processorError
        },
        tx,
      ),
    ).rejects.toBe(processorError)

    expect(create).toHaveBeenCalledOnce()
    expect(remove).not.toHaveBeenCalled()
  })
})
