import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { Stripe } from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WebhookHandlerDependencies } from '@/pages/api/stripe/webhook'
import { createWebhookHandler } from '@/pages/api/stripe/webhook'

const testStripe = new Stripe('sk_test_dummy')
const webhookSecret = 'test-secret'
const payload = JSON.stringify({
  data: { object: { id: 'cs_reliability' } },
  id: 'evt_reliability',
  type: 'checkout.session.completed',
})
const signature = testStripe.webhooks.generateTestHeaderString({
  payload,
  secret: webhookSecret,
})
const event = testStripe.webhooks.constructEvent(payload, signature, webhookSecret)
const irrelevantPayload = JSON.stringify({
  data: { object: { id: 'pm_irrelevant' } },
  id: 'evt_irrelevant',
  type: 'payment_method.attached',
})
const irrelevantSignature = testStripe.webhooks.generateTestHeaderString({
  payload: irrelevantPayload,
  secret: webhookSecret,
})
const irrelevantEvent = testStripe.webhooks.constructEvent(
  irrelevantPayload,
  irrelevantSignature,
  webhookSecret,
)
const voidedPayload = JSON.stringify({
  created: 1_750_000_000,
  data: {
    object: {
      amount_due: 2500,
      amount_paid: 0,
      amount_remaining: 2500,
      attempt_count: 1,
      billing_reason: 'subscription_cycle',
      collection_method: 'charge_automatically',
      currency: 'usd',
      customer: 'cus_voided',
      id: 'in_voided',
      lines: { data: [] },
      parent: null,
      status: 'void',
      status_transitions: {
        marked_uncollectible_at: null,
        paid_at: null,
        voided_at: 1_750_000_100,
      },
    },
  },
  id: 'evt_voided',
  livemode: true,
  type: 'invoice.voided',
})
const voidedSignature = testStripe.webhooks.generateTestHeaderString({
  payload: voidedPayload,
  secret: webhookSecret,
})
const voidedEvent = testStripe.webhooks.constructEvent(
  voidedPayload,
  voidedSignature,
  webhookSecret,
)
const noLocalRowPayload = JSON.stringify({
  created: 1_750_000_000,
  data: {
    object: {
      amount_due: 2500,
      amount_paid: 0,
      amount_remaining: 2500,
      attempt_count: 1,
      billing_reason: 'subscription_cycle',
      collection_method: 'charge_automatically',
      currency: 'usd',
      customer: 'cus_no_local_row',
      id: 'in_no_local_row',
      lines: { data: [{ parent: null, subscription: 'sub_no_local_row' }] },
      metadata: {},
      parent: null,
      status: 'open',
      status_transitions: {
        marked_uncollectible_at: null,
        paid_at: null,
        voided_at: null,
      },
    },
  },
  id: 'evt_no_local_row',
  livemode: true,
  type: 'invoice.payment_failed',
})
const noLocalRowSignature = testStripe.webhooks.generateTestHeaderString({
  payload: noLocalRowPayload,
  secret: webhookSecret,
})
const noLocalRowEvent = testStripe.webhooks.constructEvent(
  noLocalRowPayload,
  noLocalRowSignature,
  webhookSecret,
)
const createRequestResponse = (method: 'GET' | 'POST' = 'POST') =>
  createMocks<NextApiRequest, NextApiResponse>({
    method,
  })

describe('Stripe webhook reliability', () => {
  const tx = new PrismaClient()
  const create = vi.spyOn(tx.webhookEvent, 'create')
  const findUnique = vi.spyOn(tx.webhookEvent, 'findUnique')
  const processWebhookEventMock = vi.fn<WebhookHandlerDependencies['processWebhookEvent']>()
  const verifyWebhook = vi.fn<WebhookHandlerDependencies['verifyWebhook']>()
  const transaction = vi.fn<WebhookHandlerDependencies['withTransaction']>()
  const receipt = {
    billingFacts: null,
    eventType: 'checkout.session.completed',
    id: 'receipt-1',
    processedAt: new Date('2026-09-07T12:00:00.000Z'),
    stripeEventId: event.id,
  }
  const handler = createWebhookHandler({
    processWebhookEvent: processWebhookEventMock,
    verifyWebhook,
    withTransaction: transaction,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    processWebhookEventMock.mockResolvedValue()
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
    expect(processWebhookEventMock).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(405)
    expect(res._getJSONData()).toStrictEqual({ error: 'Method not allowed' })
  })

  it('returns 400 when webhook verification fails without processing', async () => {
    verifyWebhook.mockResolvedValue({ error: 'Webhook verification failed' })
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(verifyWebhook).toHaveBeenCalledOnce()
    expect(transaction).not.toHaveBeenCalled()
    expect(processWebhookEventMock).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toStrictEqual({ error: 'Webhook verification failed' })
  })

  it('returns 200 for irrelevant events without processing', async () => {
    verifyWebhook.mockResolvedValue({ event: irrelevantEvent })
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(verifyWebhook).toHaveBeenCalledOnce()
    expect(transaction).not.toHaveBeenCalled()
    expect(processWebhookEventMock).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({ received: true })
  })

  it('returns 500 and invokes a rejected handler once per delivery', async () => {
    processWebhookEventMock.mockRejectedValue(new Error('processor failed'))
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(transaction).toHaveBeenCalledOnce()
    expect(processWebhookEventMock).toHaveBeenCalledOnce()
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
    expect(processWebhookEventMock).not.toHaveBeenCalled()
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
    expect(processWebhookEventMock).not.toHaveBeenCalled()
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

    expect(processWebhookEventMock).toHaveBeenCalledOnce()
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({ processed: true, received: true })
  })

  it('stores invoice.voided facts without invoking invoice entitlement handling', async () => {
    verifyWebhook.mockResolvedValue({ event: voidedEvent })
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(processWebhookEventMock).not.toHaveBeenCalled()
    const createData = create.mock.calls[0]?.[0].data
    expect(create).toHaveBeenCalledWith({
      data: {
        billingFacts: {
          amountDueMinor: 2500,
          amountPaidMinor: 0,
          amountRemainingMinor: 2500,
          attemptCount: 1,
          billingReason: 'subscription_cycle',
          collectionMethod: 'charge_automatically',
          currency: 'usd',
          invoicePayments: [],
          kind: 'invoice',
          livemode: true,
          markedUncollectibleAt: null,
          occurredAt: 1_750_000_000,
          paidAt: null,
          paymentEvidence: 'unavailable',
          status: 'void',
          stripeCustomerId: 'cus_voided',
          stripeInvoiceId: 'in_voided',
          stripeSubscriptionId: null,
          version: 1,
          voidedAt: 1_750_000_100,
        },
        eventType: 'invoice.voided',
        processedAt: createData?.processedAt,
        stripeEventId: 'evt_voided',
      },
    })
    expect(createData?.processedAt).toBeInstanceOf(Date)
    expect(res._getJSONData()).toStrictEqual({ processed: true, received: true })
  })

  it('retains an invoice fact when processing succeeds without a local subscription write', async () => {
    verifyWebhook.mockResolvedValue({ event: noLocalRowEvent })
    const { req, res } = createRequestResponse()

    await handler(req, res)

    expect(processWebhookEventMock).toHaveBeenCalledOnce()
    const createData = create.mock.calls[0]?.[0].data
    expect({
      billingFacts: createData?.billingFacts,
      eventType: createData?.eventType,
      stripeEventId: createData?.stripeEventId,
    }).toMatchObject({
      billingFacts: {
        kind: 'invoice',
        stripeInvoiceId: 'in_no_local_row',
        stripeSubscriptionId: 'sub_no_local_row',
      },
      eventType: 'invoice.payment_failed',
      stripeEventId: 'evt_no_local_row',
    })
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({ processed: true, received: true })
  })
})
