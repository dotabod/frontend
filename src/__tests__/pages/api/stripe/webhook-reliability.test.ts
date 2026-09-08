import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { IdempotentProcessingResult } from '@/lib/stripe/utils/idempotency'
import handler from '@/pages/api/stripe/webhook'

type TestEvent = {
  data: { object: { id: string } }
  id: string
  type: 'checkout.session.completed'
}
type BooleanHandler = () => Promise<boolean>
type TransactionOperation = (tx: Prisma.TransactionClient) => Promise<IdempotentProcessingResult>

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn<() => TestEvent>(),
  handleChargeRefunded: vi.fn<BooleanHandler>(),
  handleChargeSucceeded: vi.fn<BooleanHandler>(),
  handleCheckoutCompleted: vi.fn<BooleanHandler>(),
  handleCustomerDeleted: vi.fn<BooleanHandler>(),
  handleInvoiceEvent: vi.fn<BooleanHandler>(),
  handleSubscriptionDeleted: vi.fn<BooleanHandler>(),
  handleSubscriptionEvent: vi.fn<BooleanHandler>(),
  transaction: vi.fn<(operation: TransactionOperation) => Promise<IdempotentProcessingResult>>(),
}))

vi.mock(import('@/lib/db'), async () => {
  const { PrismaClient } = await import('@prisma/client')
  const db = new PrismaClient()
  Object.defineProperty(db, '$transaction', { value: mocks.transaction })
  return { default: db }
})

vi.mock(import('@/lib/stripe-server'), async () => {
  const { Stripe } = await import('stripe')
  const stripe = new Stripe('sk_test_dummy')
  Object.defineProperty(stripe.webhooks, 'constructEvent', { value: mocks.constructEvent })
  return { stripe }
})

vi.mock(import('@/lib/stripe/handlers/charge-events'), () => ({
  handleChargeRefunded: mocks.handleChargeRefunded,
  handleChargeSucceeded: mocks.handleChargeSucceeded,
}))

vi.mock(import('@/lib/stripe/handlers/checkout-events'), () => ({
  handleCheckoutCompleted: mocks.handleCheckoutCompleted,
}))

vi.mock(import('@/lib/stripe/handlers/customer-events'), () => ({
  handleCustomerDeleted: mocks.handleCustomerDeleted,
}))

vi.mock(import('@/lib/stripe/handlers/invoice-events'), () => ({
  handleInvoiceEvent: mocks.handleInvoiceEvent,
}))

vi.mock(import('@/lib/stripe/handlers/subscription-events'), () => ({
  handleSubscriptionDeleted: mocks.handleSubscriptionDeleted,
  handleSubscriptionEvent: mocks.handleSubscriptionEvent,
}))

const event: TestEvent = {
  data: {
    object: {
      id: 'cs_reliability',
    },
  },
  id: 'evt_reliability',
  type: 'checkout.session.completed',
}

const createRequestResponse = () => {
  const requestResponse = createMocks<NextApiRequest, NextApiResponse>({
    headers: { 'stripe-signature': 'test-signature' },
    method: 'POST',
  })
  requestResponse.req.once('async_iterator', () => {
    requestResponse.req.emit('data', Buffer.from('{}'))
    requestResponse.req.emit('end')
  })
  return requestResponse
}

describe('Stripe webhook reliability', () => {
  const tx = new PrismaClient()
  const create = vi.spyOn(tx.webhookEvent, 'create')
  const findUnique = vi.spyOn(tx.webhookEvent, 'findUnique')
  const receipt = {
    eventType: 'checkout.session.completed',
    id: 'receipt-1',
    processedAt: new Date('2026-09-07T12:00:00.000Z'),
    stripeEventId: event.id,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'test-secret')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    mocks.constructEvent.mockReturnValue(event)
    mocks.handleCheckoutCompleted.mockResolvedValue(true)
    mocks.transaction.mockImplementation(async (operation) => await operation(tx))
    findUnique.mockResolvedValue(null)
    create.mockResolvedValue(receipt)
  })

  afterAll(async () => {
    await tx.$disconnect()
  })

  it('returns 500 when real webhook processing rejects', async () => {
    mocks.handleCheckoutCompleted.mockRejectedValue(new Error('processor failed'))
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.handleCheckoutCompleted).toHaveBeenCalledOnce()
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toStrictEqual({
      error: 'Webhook processing failed',
      received: true,
    })
  })

  it('returns 500 when the real transaction helper rejects', async () => {
    mocks.transaction.mockRejectedValue(new Error('database unavailable'))
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.handleCheckoutCompleted).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toStrictEqual({
      error: 'Webhook processing failed',
      received: true,
    })
  })

  it('returns 200 for an existing production receipt without dispatching a handler', async () => {
    findUnique.mockResolvedValue(receipt)
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.handleCheckoutCompleted).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({
      processed: true,
      processedAt: receipt.processedAt.toISOString(),
      received: true,
      skipped: true,
    })
  })

  it('returns 200 after real webhook processing succeeds', async () => {
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(mocks.handleCheckoutCompleted).toHaveBeenCalledOnce()
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({ processed: true, received: true })
  })
})
