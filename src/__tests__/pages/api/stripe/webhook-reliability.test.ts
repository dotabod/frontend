import { Readable } from 'node:stream'

import type { Prisma } from '@prisma/client'
import type { NextApiRequest } from 'next'
import { createMocks } from 'node-mocks-http'
import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '@/pages/api/stripe/webhook'

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  handleChargeRefunded: vi.fn(),
  handleChargeSucceeded: vi.fn(),
  handleCheckoutCompleted: vi.fn(),
  handleCustomerDeleted: vi.fn(),
  handleInvoiceEvent: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  handleSubscriptionEvent: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  default: {
    $transaction: mocks.transaction,
  },
}))

vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    webhooks: {
      constructEvent: mocks.constructEvent,
    },
  },
}))

vi.mock('@/lib/stripe/handlers/charge-events', () => ({
  handleChargeRefunded: mocks.handleChargeRefunded,
  handleChargeSucceeded: mocks.handleChargeSucceeded,
}))

vi.mock('@/lib/stripe/handlers/checkout-events', () => ({
  handleCheckoutCompleted: mocks.handleCheckoutCompleted,
}))

vi.mock('@/lib/stripe/handlers/customer-events', () => ({
  handleCustomerDeleted: mocks.handleCustomerDeleted,
}))

vi.mock('@/lib/stripe/handlers/invoice-events', () => ({
  handleInvoiceEvent: mocks.handleInvoiceEvent,
}))

vi.mock('@/lib/stripe/handlers/subscription-events', () => ({
  handleSubscriptionDeleted: mocks.handleSubscriptionDeleted,
  handleSubscriptionEvent: mocks.handleSubscriptionEvent,
}))

const event = {
  data: {
    object: {
      id: 'cs_reliability',
    },
  },
  id: 'evt_reliability',
  type: 'checkout.session.completed',
} as unknown as Stripe.Event

const createRequest = (): NextApiRequest => {
  const request = Readable.from([Buffer.from('{}')]) as unknown as NextApiRequest
  request.headers = { 'stripe-signature': 'test-signature' }
  request.method = 'POST'
  return request
}

describe('Stripe webhook reliability', () => {
  const create = vi.fn()
  const findUnique = vi.fn()
  const tx = {
    webhookEvent: {
      create,
      findUnique,
    },
  } as unknown as Prisma.TransactionClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'test-secret')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    mocks.constructEvent.mockReturnValue(event)
    mocks.handleCheckoutCompleted.mockResolvedValue(true)
    mocks.transaction.mockImplementation(
      async (operation: (transactionClient: Prisma.TransactionClient) => Promise<unknown>) =>
        operation(tx),
    )
    findUnique.mockResolvedValue(null)
    create.mockResolvedValue({ id: 'receipt' })
  })

  it('returns 500 when real webhook processing rejects', async () => {
    mocks.handleCheckoutCompleted.mockRejectedValue(new Error('processor failed'))
    const { res } = createMocks()

    await handler(createRequest(), res)

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
    const { res } = createMocks()

    await handler(createRequest(), res)

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.handleCheckoutCompleted).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toStrictEqual({
      error: 'Webhook processing failed',
      received: true,
    })
  })

  it('returns 200 for an existing production receipt without dispatching a handler', async () => {
    const processedAt = new Date('2026-09-07T12:00:00.000Z')
    findUnique.mockResolvedValue({ processedAt })
    const { res } = createMocks()

    await handler(createRequest(), res)

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.handleCheckoutCompleted).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({
      processed: true,
      processedAt: processedAt.toISOString(),
      received: true,
      skipped: true,
    })
  })

  it('returns 200 after real webhook processing succeeds', async () => {
    const { res } = createMocks()

    await handler(createRequest(), res)

    expect(mocks.handleCheckoutCompleted).toHaveBeenCalledOnce()
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({ processed: true, received: true })
  })
})
