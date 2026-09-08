import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { Stripe } from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WebhookHandlerDependencies } from '@/pages/api/stripe/webhook'
import { createWebhookHandler } from '@/pages/api/stripe/webhook'

const stripe = new Stripe('sk_test_dummy')
const webhookSecret = 'test-secret'
const payload = JSON.stringify({
  data: { object: { id: 'cs_reliability' } },
  id: 'evt_reliability',
  type: 'checkout.session.completed',
})
const signature = stripe.webhooks.generateTestHeaderString({
  payload,
  secret: webhookSecret,
})
const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
const irrelevantPayload = JSON.stringify({
  data: { object: {} },
  id: 'evt_irrelevant',
  type: 'ping',
})
const irrelevantSignature = stripe.webhooks.generateTestHeaderString({
  payload: irrelevantPayload,
  secret: webhookSecret,
})
const irrelevantEvent = stripe.webhooks.constructEvent(
  irrelevantPayload,
  irrelevantSignature,
  webhookSecret,
)

const createRequestResponse = (method = 'POST') =>
  createMocks<NextApiRequest, NextApiResponse>({
    method,
  })

describe('Stripe webhook reliability', () => {
  const tx = new PrismaClient()
  const create = vi.spyOn(tx.webhookEvent, 'create')
  const findUnique = vi.spyOn(tx.webhookEvent, 'findUnique')
  const processWebhookEvent = vi.fn<WebhookHandlerDependencies['processWebhookEvent']>()
  const verifyWebhook = vi.fn<WebhookHandlerDependencies['verifyWebhook']>()
  const transaction = vi.fn<WebhookHandlerDependencies['withTransaction']>()
  const receipt = {
    eventType: 'checkout.session.completed',
    id: 'receipt-1',
    processedAt: new Date('2026-09-07T12:00:00.000Z'),
    stripeEventId: event.id,
  }
  const handler = createWebhookHandler({
    processWebhookEvent,
    verifyWebhook,
    withTransaction: transaction,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    processWebhookEvent.mockResolvedValue()
    verifyWebhook.mockResolvedValue({ event })
    transaction.mockImplementation(async (operation) => await operation(tx))
    findUnique.mockResolvedValue(null)
    create.mockResolvedValue(receipt)
  })

  it('returns 405 for non-POST requests without verifying or processing', async () => {
    const { req, res } = createRequestResponse('GET')

    await handler(req, res)

    expect(verifyWebhook).not.toHaveBeenCalled()
    expect(transaction).not.toHaveBeenCalled()
    expect(processWebhookEvent).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(405)
    expect(res._getJSONData()).toStrictEqual({ error: 'Method not allowed' })
  })

  it('returns 400 when webhook verification fails without processing', async () => {
    verifyWebhook.mockResolvedValue({ error: 'Webhook verification failed' })
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(verifyWebhook).toHaveBeenCalledOnce()
    expect(transaction).not.toHaveBeenCalled()
    expect(processWebhookEvent).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toStrictEqual({ error: 'Webhook verification failed' })
  })

  it('returns 200 for irrelevant events without processing', async () => {
    verifyWebhook.mockResolvedValue({ event: irrelevantEvent })
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(verifyWebhook).toHaveBeenCalledOnce()
    expect(transaction).not.toHaveBeenCalled()
    expect(processWebhookEvent).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({ received: true })
  })

  it('returns 500 and invokes a rejected handler once per delivery', async () => {
    processWebhookEvent.mockRejectedValue(new Error('processor failed'))
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(transaction).toHaveBeenCalledOnce()
    expect(processWebhookEvent).toHaveBeenCalledOnce()
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toStrictEqual({
      error: 'Webhook processing failed',
      received: true,
    })
  })

  it('returns 500 when the transaction rejects', async () => {
    transaction.mockRejectedValue(new Error('database unavailable'))
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(transaction).toHaveBeenCalledOnce()
    expect(processWebhookEvent).not.toHaveBeenCalled()
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

    expect(transaction).toHaveBeenCalledOnce()
    expect(processWebhookEvent).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({
      processed: true,
      processedAt: receipt.processedAt.toISOString(),
      received: true,
      skipped: true,
    })
  })

  it('returns 200 after webhook processing succeeds', async () => {
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(processWebhookEvent).toHaveBeenCalledOnce()
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({ processed: true, received: true })
  })
})
