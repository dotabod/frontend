import type { Prisma } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BillingFacts } from '@/lib/stripe/utils/billing-facts'
import { processEventIdempotently } from '@/lib/stripe/utils/idempotency'

describe(processEventIdempotently, () => {
  const tx = new PrismaClient()
  const create = vi.spyOn(tx.webhookEvent, 'create')
  const remove = vi.spyOn(tx.webhookEvent, 'delete')
  const findUnique = vi.spyOn(tx.webhookEvent, 'findUnique')
  const receipt = {
    billingFacts: null,
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
      processEventIdempotently('evt_1', 'checkout.session.completed', undefined, processor, tx),
    ).resolves.toStrictEqual({ kind: 'processed' })

    expect(processor).toHaveBeenCalledOnce()
    expect(findUnique).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('returns a successful duplicate without invoking the processor', async () => {
    findUnique.mockResolvedValue(receipt)
    const processor = vi.fn<(transaction: Prisma.TransactionClient) => Promise<void>>()

    await expect(
      processEventIdempotently('evt_1', 'checkout.session.completed', undefined, processor, tx),
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
        undefined,
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

  it('stores billing facts on the receipt create', async () => {
    const billingFacts = {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancellationReason: null,
      currentPeriodEnd: 1_800_000_000,
      endedAt: null,
      kind: 'subscription',
      livemode: true,
      occurredAt: 1_700_000_000,
      status: 'active',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
      trialEnd: null,
      trialStart: null,
      version: 1,
    } satisfies BillingFacts
    const processor = vi
      .fn<(transaction: Prisma.TransactionClient) => Promise<void>>()
      .mockResolvedValue()

    await processEventIdempotently(
      'evt_1',
      'customer.subscription.updated',
      billingFacts,
      processor,
      tx,
    )

    expect(create).toHaveBeenCalledWith({
      data: {
        billingFacts,
        eventType: 'customer.subscription.updated',
        processedAt: create.mock.calls[0]?.[0].data.processedAt,
        stripeEventId: 'evt_1',
      },
    })
    expect(create.mock.calls[0]?.[0].data.processedAt).toBeInstanceOf(Date)
  })
})
