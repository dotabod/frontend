import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { Stripe } from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { stripe as serverStripe } from '@/lib/stripe-server'
import type { WebhookHandlerDependencies } from '@/pages/api/stripe/webhook'
import type { WebhookEventProcessorDependencies } from '@/pages/api/stripe/webhook'
import {
  createWebhookHandler,
  processWebhookEvent as processVerifiedWebhookEvent,
} from '@/pages/api/stripe/webhook'

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
      amount_due: 2_500,
      amount_paid: 0,
      amount_remaining: 2_500,
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
      amount_due: 2_500,
      amount_paid: 0,
      amount_remaining: 2_500,
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
const providerSubscriptionPayload = JSON.stringify({
  data: {
    object: {
      cancel_at_period_end: false,
      customer: 'cus_no_local_row',
      id: 'sub_no_local_row',
      items: { data: [{ current_period_end: 1_800_000_000 }] },
      status: 'active',
    },
  },
  id: 'evt_provider_subscription',
  type: 'customer.subscription.updated',
})
const providerSubscriptionSignature = testStripe.webhooks.generateTestHeaderString({
  payload: providerSubscriptionPayload,
  secret: webhookSecret,
})
const providerSubscriptionEvent = testStripe.webhooks.constructEvent(
  providerSubscriptionPayload,
  providerSubscriptionSignature,
  webhookSecret,
)

if (providerSubscriptionEvent.type !== 'customer.subscription.updated') {
  throw new Error('Expected a subscription event fixture')
}

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
    const handleInvoiceEvent = vi
      .fn<WebhookEventProcessorDependencies['handleInvoiceEvent']>()
      .mockResolvedValue(true)
    const voidedHandler = createWebhookHandler({
      processWebhookEvent: async (verifiedEvent, transactionClient) =>
        await processVerifiedWebhookEvent(verifiedEvent, transactionClient, {
          handleInvoiceEvent,
        }),
      verifyWebhook,
      withTransaction: transaction,
    })
    const { req, res } = createRequestResponse()

    await voidedHandler(req, res)

    expect(handleInvoiceEvent).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith({
      data: {
        billingFacts: {
          amountDueMinor: 2_500,
          amountPaidMinor: 0,
          amountRemainingMinor: 2_500,
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
        processedAt: expect.any(Date),
        stripeEventId: 'evt_voided',
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({ processed: true, received: true })
  })

  it('retains an invoice fact when the existing handler updates no local subscription row', async () => {
    verifyWebhook.mockResolvedValue({ event: noLocalRowEvent })
    vi.spyOn(tx, '$executeRaw').mockResolvedValue(0)
    const updateMany = vi.spyOn(tx.subscription, 'updateMany').mockResolvedValue({ count: 0 })
    vi.spyOn(serverStripe.subscriptions, 'retrieve').mockResolvedValue(
      providerSubscriptionEvent.data.object,
    )
    const noLocalRowHandler = createWebhookHandler({
      processWebhookEvent: processVerifiedWebhookEvent,
      verifyWebhook,
      withTransaction: transaction,
    })
    const { req, res } = createRequestResponse()

    await noLocalRowHandler(req, res)

    expect(updateMany).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingFacts: expect.objectContaining({
          kind: 'invoice',
          stripeInvoiceId: 'in_no_local_row',
          stripeSubscriptionId: 'sub_no_local_row',
        }),
        eventType: 'invoice.payment_failed',
        stripeEventId: 'evt_no_local_row',
      }),
    })
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toStrictEqual({ processed: true, received: true })
  })
})
