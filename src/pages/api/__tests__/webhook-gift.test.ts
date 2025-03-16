import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import handler from '../stripe/webhook'
import { stripe } from '@/lib/stripe-server'
import prisma from '@/lib/db'
import { aggregateGiftDuration } from '@/lib/gift-subscription'
import type { Stripe } from 'stripe'
import type { PrismaClient } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    checkout: {
      sessions: {
        listLineItems: vi.fn(),
      },
    },
    customers: {
      retrieve: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}))

vi.mock('@/lib/db', () => ({
  default: {
    $transaction: vi.fn((callback) =>
      callback({
        webhookEvent: {
          create: vi.fn(),
          findUnique: vi.fn(),
        },
        user: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        subscription: {
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        giftSubscription: {
          create: vi.fn(),
        },
        notification: {
          create: vi.fn(),
        },
        giftTransaction: {
          create: vi.fn(),
        },
      }),
    ),
  },
}))

vi.mock('@/lib/gift-subscription', () => ({
  aggregateGiftDuration: vi.fn(),
}))

// Mock the getRawBody function
vi.mock('raw-body', () => ({
  default: vi.fn(() => Promise.resolve(Buffer.from(JSON.stringify({ id: 'evt_test' })))),
}))

describe('Stripe Webhook Handler - Gift Subscriptions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICE_MONTHLY', 'price_monthly_test')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICE_ANNUAL', 'price_annual_test')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICE_LIFETIME', 'price_lifetime_test')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('processes gift subscription checkout.session.completed events', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'valid_signature',
        'stripe-webhook-secret': 'test_secret',
      },
    })

    // Mock the stripe webhook event
    const mockEvent = {
      id: 'evt_test',
      type: 'checkout.session.completed',
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: { id: 'req_test', idempotency_key: 'idem_test' },
      data: {
        object: {
          id: 'cs_test',
          object: 'checkout.session',
          metadata: {
            isGift: 'true',
            recipientUserId: 'user-123',
            giftSenderName: 'Gift Sender',
            giftMessage: 'Enjoy your gift!',
            giftDuration: 'monthly',
            giftQuantity: '3',
            gifterId: 'gifter-123',
          },
          amount_total: 2500,
          currency: 'usd',
          customer: 'cus_test',
          payment_status: 'paid',
          status: 'complete',
          mode: 'payment',
          client_reference_id: null,
          expires_at: null,
        },
      },
    } as const

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(
      mockEvent as unknown as Stripe.Event,
    )

    // Mock line items
    vi.mocked(stripe.checkout.sessions.listLineItems).mockResolvedValueOnce({
      data: [{ quantity: 3 }],
    } as Stripe.Response<Stripe.ApiList<Stripe.LineItem>>)

    // Mock recipient user
    const mockUser = {
      id: 'user-123',
      email: 'recipient@example.com',
      name: 'Recipient',
      locale: 'en',
    }

    const mockTx = {
      webhookEvent: {
        create: vi.fn().mockResolvedValueOnce({ id: 'webhook-1' }),
        findUnique: vi.fn().mockResolvedValueOnce(null),
      },
      user: {
        findUnique: vi.fn().mockResolvedValueOnce(mockUser),
        update: vi.fn().mockResolvedValueOnce({ id: 'user-123' }),
      },
      subscription: {
        findFirst: vi.fn().mockResolvedValueOnce(null),
        create: vi.fn().mockResolvedValueOnce({ id: 'sub-123' }),
      },
      giftSubscription: {
        create: vi.fn().mockResolvedValueOnce({ id: 'gift-123' }),
      },
      notification: {
        create: vi.fn().mockResolvedValueOnce({ id: 'notif-123' }),
      },
      giftTransaction: {
        create: vi.fn().mockResolvedValueOnce({ id: 'tx-123' }),
      },
    }

    vi.mocked(prisma.$transaction).mockImplementationOnce((callback) =>
      callback(mockTx as unknown as PrismaClient),
    )

    // Mock the aggregateGiftDuration function
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 3)
    vi.mocked(aggregateGiftDuration).mockReturnValueOnce(futureDate)

    await handler(req, res)

    // Verify the response
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ received: true })

    // Verify the transaction was processed correctly
    expect(mockTx.webhookEvent.create).toHaveBeenCalled()
    expect(mockTx.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: expect.objectContaining({
        id: true,
        email: true,
      }),
    })

    // Verify subscription was created
    expect(mockTx.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        status: 'ACTIVE',
        tier: 'PRO',
        isGift: true,
      }),
    })

    // Verify gift subscription was created
    expect(mockTx.giftSubscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriptionId: 'sub-123',
        senderName: 'Gift Sender',
        giftMessage: 'Enjoy your gift!',
        giftType: 'monthly',
        giftQuantity: 3,
      }),
    })

    // Verify notification was created
    expect(mockTx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        type: 'GIFT_SUBSCRIPTION',
        giftSubscriptionId: 'gift-123',
      }),
    })

    // Verify gift transaction was created
    expect(mockTx.giftTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        giftSubscriptionId: 'gift-123',
        recipientId: 'user-123',
        gifterId: 'gifter-123',
        giftType: 'monthly',
        giftQuantity: 3,
        amount: 2500,
        currency: 'usd',
      }),
    })

    // Verify user's proExpiration was updated
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {
        proExpiration: futureDate,
      },
    })
  })

  it('processes lifetime gift subscriptions correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'valid_signature',
        'stripe-webhook-secret': 'test_secret',
      },
    })

    // Mock the stripe webhook event
    const mockEvent = {
      id: 'evt_test',
      type: 'checkout.session.completed',
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: { id: 'req_test', idempotency_key: 'idem_test' },
      data: {
        object: {
          id: 'cs_test',
          object: 'checkout.session',
          metadata: {
            isGift: 'true',
            recipientUserId: 'user-123',
            giftSenderName: 'Gift Sender',
            giftMessage: 'Enjoy your lifetime gift!',
            giftDuration: 'lifetime',
            giftQuantity: '1',
            gifterId: 'gifter-123',
          },
          amount_total: 10000,
          currency: 'usd',
          customer: 'cus_test',
          payment_status: 'paid',
          status: 'complete',
          mode: 'payment',
          client_reference_id: null,
          expires_at: null,
        },
      },
    } as const

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(
      mockEvent as unknown as Stripe.Event,
    )

    // Mock line items
    vi.mocked(stripe.checkout.sessions.listLineItems).mockResolvedValueOnce({
      data: [{ quantity: 1 }],
    } as Stripe.Response<Stripe.ApiList<Stripe.LineItem>>)

    // Mock recipient user
    const mockUser = {
      id: 'user-123',
      email: 'recipient@example.com',
      name: 'Recipient',
      locale: 'en',
    }

    const mockTx = {
      webhookEvent: {
        create: vi.fn().mockResolvedValueOnce({ id: 'webhook-1' }),
        findUnique: vi.fn().mockResolvedValueOnce(null),
      },
      user: {
        findUnique: vi.fn().mockResolvedValueOnce(mockUser),
        update: vi.fn().mockResolvedValueOnce({ id: 'user-123' }),
      },
      subscription: {
        findFirst: vi.fn().mockResolvedValueOnce(null),
        create: vi.fn().mockResolvedValueOnce({ id: 'sub-123' }),
      },
      giftSubscription: {
        create: vi.fn().mockResolvedValueOnce({ id: 'gift-123' }),
      },
      notification: {
        create: vi.fn().mockResolvedValueOnce({ id: 'notif-123' }),
      },
      giftTransaction: {
        create: vi.fn().mockResolvedValueOnce({ id: 'tx-123' }),
      },
    }

    vi.mocked(prisma.$transaction).mockImplementationOnce((callback) =>
      callback(mockTx as unknown as PrismaClient),
    )

    await handler(req, res)

    // Verify the response
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ received: true })

    // Verify subscription was created with lifetime transaction type
    expect(mockTx.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        status: 'ACTIVE',
        tier: 'PRO',
        transactionType: 'LIFETIME',
        isGift: true,
      }),
    })

    // Verify user's proExpiration was set to far future date
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {
        proExpiration: expect.any(Date),
      },
    })

    // Get the date that was used to update proExpiration
    const updateCall = mockTx.user.update.mock.calls[0][0]
    const proExpirationDate = updateCall.data.proExpiration

    // Verify it's a far future date (2099 or later)
    expect(proExpirationDate.getFullYear()).toBeGreaterThanOrEqual(2099)
  })

  it('extends existing subscription when user already has one', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'valid_signature',
        'stripe-webhook-secret': 'test_secret',
      },
    })

    // Mock the stripe webhook event
    const mockEvent = {
      id: 'evt_test',
      type: 'checkout.session.completed',
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: { id: 'req_test', idempotency_key: 'idem_test' },
      data: {
        object: {
          id: 'cs_test',
          object: 'checkout.session',
          metadata: {
            isGift: 'true',
            recipientUserId: 'user-123',
            giftSenderName: 'Gift Sender',
            giftMessage: 'Extending your subscription!',
            giftDuration: 'monthly',
            giftQuantity: '2',
            gifterId: 'gifter-123',
          },
          amount_total: 2000,
          currency: 'usd',
          customer: 'cus_test',
          payment_status: 'paid',
          status: 'complete',
          mode: 'payment',
          client_reference_id: null,
          expires_at: null,
        },
      },
    } as const

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(
      mockEvent as unknown as Stripe.Event,
    )

    // Mock line items
    vi.mocked(stripe.checkout.sessions.listLineItems).mockResolvedValueOnce({
      data: [{ quantity: 2 }],
    } as Stripe.Response<Stripe.ApiList<Stripe.LineItem>>)

    // Mock recipient user
    const mockUser = {
      id: 'user-123',
      email: 'recipient@example.com',
      name: 'Recipient',
      locale: 'en',
    }

    // Create a date 1 month in the future
    const existingExpiration = new Date()
    existingExpiration.setMonth(existingExpiration.getMonth() + 1)

    // Create a date 3 months in the future (1 existing + 2 new)
    const newExpiration = new Date()
    newExpiration.setMonth(newExpiration.getMonth() + 3)

    // Mock existing subscription
    const existingSubscription = {
      id: 'sub-123',
      userId: 'user-123',
      status: 'ACTIVE',
      tier: 'PRO',
      currentPeriodEnd: existingExpiration,
      metadata: {},
    }

    const mockTx = {
      webhookEvent: {
        create: vi.fn().mockResolvedValueOnce({ id: 'webhook-1' }),
        findUnique: vi.fn().mockResolvedValueOnce(null),
      },
      user: {
        findUnique: vi.fn().mockResolvedValueOnce(mockUser),
        update: vi.fn().mockResolvedValueOnce({ id: 'user-123' }),
      },
      subscription: {
        findFirst: vi.fn().mockResolvedValueOnce(existingSubscription),
        update: vi.fn().mockResolvedValueOnce({ id: 'sub-123' }),
      },
      giftSubscription: {
        create: vi.fn().mockResolvedValueOnce({ id: 'gift-123' }),
      },
      notification: {
        create: vi.fn().mockResolvedValueOnce({ id: 'notif-123' }),
      },
      giftTransaction: {
        create: vi.fn().mockResolvedValueOnce({ id: 'tx-123' }),
      },
    }

    vi.mocked(prisma.$transaction).mockImplementationOnce((callback) =>
      callback(mockTx as unknown as PrismaClient),
    )

    // Mock the aggregateGiftDuration function
    vi.mocked(aggregateGiftDuration).mockReturnValueOnce(newExpiration)

    await handler(req, res)

    // Verify the response
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ received: true })

    // Verify subscription was updated
    expect(mockTx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-123' },
      data: expect.objectContaining({
        currentPeriodEnd: newExpiration,
      }),
    })

    // Verify user's proExpiration was updated
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {
        proExpiration: newExpiration,
      },
    })
  })
})
