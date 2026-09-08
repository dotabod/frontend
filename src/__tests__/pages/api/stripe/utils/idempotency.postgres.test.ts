import { randomUUID } from 'node:crypto'

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import prisma from '@/lib/db'
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
    receiptIds.add(eventId)
    scheduledMessageIds.add(scheduledMessageId)

    await expect(
      withTransaction(
        async (tx) =>
          await processEventIdempotently(
            eventId,
            'checkout.session.completed',
            async (tx) => {
              await tx.scheduledMessage.create({
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
    const processorStarted = Promise.withResolvers<void>()
    const processorReleased = Promise.withResolvers<void>()
    const racingCreateStarted = Promise.withResolvers<void>()
    const countProcessor = async () => {
      await Promise.resolve()
      processorCalls += 1
    }

    const firstDelivery = withTransaction(
      async (tx) =>
        await processEventIdempotently(
          eventId,
          'checkout.session.completed',
          async () => {
            processorCalls += 1
            processorStarted.resolve()
            await processorReleased.promise
          },
          tx,
        ),
    )

    await processorStarted.promise

    const secondDelivery = withTransaction(async (tx) => {
      const createReceipt = tx.webhookEvent.create.bind(tx.webhookEvent)
      const createSpy = vi.spyOn(tx.webhookEvent, 'create').mockImplementation(async (args) => {
        racingCreateStarted.resolve()
        return await createReceipt(args)
      })

      try {
        return await processEventIdempotently(
          eventId,
          'checkout.session.completed',
          countProcessor,
          tx,
        )
      } finally {
        createSpy.mockRestore()
      }
    })
    const secondDeliveryFailure = expect(secondDelivery).rejects.toMatchObject({ code: 'P2002' })

    await racingCreateStarted.promise
    processorReleased.resolve()

    await expect(firstDelivery).resolves.toStrictEqual({ kind: 'processed' })
    await secondDeliveryFailure

    const laterDelivery = await withTransaction(
      async (tx) =>
        await processEventIdempotently(eventId, 'checkout.session.completed', countProcessor, tx),
    )

    expect(laterDelivery.kind).toBe('duplicate')
    expect(processorCalls).toBe(1)
    await expect(prisma.webhookEvent.count({ where: { stripeEventId: eventId } })).resolves.toBe(1)
  }, 20_000)
})
