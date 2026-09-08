import { randomUUID } from 'node:crypto'
import { setTimeout } from 'node:timers/promises'

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import prisma from '@/lib/db'
import type { BillingFacts } from '@/lib/stripe/utils/billing-facts'
import { processEventIdempotently } from '@/lib/stripe/utils/idempotency'
import { withTransaction } from '@/lib/stripe/utils/transaction'

const describePostgres =
  process.env.RUN_STRIPE_WEBHOOK_POSTGRES_TESTS === 'true' ? describe : describe.skip

describePostgres('Stripe webhook PostgreSQL reliability', () => {
  const receiptIds = new Set<string>()
  const scheduledMessageIds = new Set<string>()

  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'production')
  })

  afterEach(async () => {
    await prisma.webhookEvent.deleteMany({
      where: { stripeEventId: { in: [...receiptIds] } },
    })
    await prisma.scheduledMessage.deleteMany({
      where: { id: { in: [...scheduledMessageIds] } },
    })
    receiptIds.clear()
    scheduledMessageIds.clear()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('rolls back the receipt and prior processor writes when the processor throws', async () => {
    const eventId = `evt_rollback_${randomUUID()}`
    const scheduledMessageId = randomUUID()
    let processorCalls = 0
    receiptIds.add(eventId)
    scheduledMessageIds.add(scheduledMessageId)
    const billingFacts = {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancellationReason: null,
      currentPeriodEnd: 1_800_000_000,
      endedAt: null,
      kind: 'subscription',
      livemode: true,
      occurredAt: 1_700_000_000,
      status: 'past_due',
      stripeCustomerId: 'cus_rollback',
      stripeSubscriptionId: 'sub_rollback',
      trialEnd: null,
      trialStart: null,
      version: 1,
    } satisfies BillingFacts

    await expect(
      withTransaction(
        async (tx) =>
          await processEventIdempotently(
            eventId,
            'customer.subscription.updated',
            billingFacts,
            async (transactionClient) => {
              processorCalls += 1
              await transactionClient.scheduledMessage.create({
                data: {
                  id: scheduledMessageId,
                  message: 'Webhook reliability rollback sentinel',
                  sendAt: new Date('2030-01-01T00:00:00.000Z'),
                },
              })
              throw new Error('processor failed')
            },
            tx,
          ),
      ),
    ).rejects.toThrow('processor failed')

    expect(processorCalls).toBe(1)
    await expect(
      Promise.all([
        prisma.webhookEvent.findUnique({ where: { stripeEventId: eventId } }),
        prisma.scheduledMessage.findUnique({ where: { id: scheduledMessageId } }),
      ]),
    ).resolves.toStrictEqual([null, null])
  })

  it('rejects the racing insert and lets a later delivery return the duplicate', async () => {
    const eventId = `evt_concurrent_${randomUUID()}`
    receiptIds.add(eventId)
    let processorCalls = 0
    const processorStarted = Promise.withResolvers<boolean>()
    const processorReleased = Promise.withResolvers<boolean>()
    const countProcessor = async () => {
      await Promise.resolve()
      processorCalls += 1
    }

    const firstDelivery = withTransaction(
      async (tx) =>
        await processEventIdempotently(
          eventId,
          'checkout.session.completed',
          undefined,
          async () => {
            processorCalls += 1
            processorStarted.resolve(true)
            await processorReleased.promise
          },
          tx,
        ),
    )

    await processorStarted.promise

    const secondDelivery = withTransaction(
      async (tx) =>
        await processEventIdempotently(
          eventId,
          'checkout.session.completed',
          undefined,
          countProcessor,
          tx,
        ),
    )
    const deliveries = Promise.allSettled([firstDelivery, secondDelivery])

    await setTimeout(100)
    processorReleased.resolve(true)

    const [firstResult, secondResult] = await deliveries
    expect(firstResult).toStrictEqual({ status: 'fulfilled', value: { kind: 'processed' } })
    expect(secondResult).toMatchObject({ reason: { code: 'P2002' }, status: 'rejected' })

    const laterDelivery = await withTransaction(
      async (tx) =>
        await processEventIdempotently(
          eventId,
          'checkout.session.completed',
          undefined,
          countProcessor,
          tx,
        ),
    )

    expect(laterDelivery.kind).toBe('duplicate')
    expect(processorCalls).toBe(1)
    await expect(prisma.webhookEvent.count({ where: { stripeEventId: eventId } })).resolves.toBe(1)
  }, 20_000)

  it('keeps the original billing fact when a later delivery is a duplicate', async () => {
    const eventId = `evt_fact_${randomUUID()}`
    receiptIds.add(eventId)
    const originalFact = {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancellationReason: null,
      currentPeriodEnd: 1_800_000_000,
      endedAt: null,
      kind: 'subscription',
      livemode: true,
      occurredAt: 1_700_000_000,
      status: 'active',
      stripeCustomerId: 'cus_original',
      stripeSubscriptionId: 'sub_original',
      trialEnd: null,
      trialStart: null,
      version: 1,
    } satisfies BillingFacts
    const laterFact = { ...originalFact, status: 'canceled' } satisfies BillingFacts
    const processor = async () => {
      await Promise.resolve()
    }

    await withTransaction(
      async (tx) =>
        await processEventIdempotently(
          eventId,
          'customer.subscription.updated',
          originalFact,
          processor,
          tx,
        ),
    )
    const duplicate = await withTransaction(
      async (tx) =>
        await processEventIdempotently(
          eventId,
          'customer.subscription.updated',
          laterFact,
          processor,
          tx,
        ),
    )

    expect(duplicate.kind).toBe('duplicate')
    await expect(
      prisma.webhookEvent.findUnique({ where: { stripeEventId: eventId } }),
    ).resolves.toMatchObject({ billingFacts: originalFact })
  })
})
