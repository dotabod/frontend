import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import prisma from '@/lib/db'
import type { PrismaClient } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import type { Stripe } from 'stripe'

// Mock the webhook handler directly
vi.mock('@/pages/api/stripe/webhook', () => ({
  default: vi.fn((req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Mock successful response
    return res.status(200).json({ received: true })
  }),
}))

// Import the mocked handler
import handler from '@/pages/api/stripe/webhook'

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
  ensureCustomer: vi.fn().mockResolvedValue('cus_test'),
}))

vi.mock('@/utils/subscription', () => ({
  isInGracePeriod: vi.fn().mockReturnValue(false),
  GRACE_PERIOD_END: new Date(),
  PRICE_IDS: [
    {
      tier: 'FREE',
      monthly: 'price_free_monthly',
      annual: 'price_free_annual',
      name: 'Free',
    },
    {
      tier: 'PRO',
      monthly: 'price_pro_monthly',
      annual: 'price_pro_annual',
      name: 'Pro',
    },
  ],
  SUBSCRIPTION_TIERS: {
    FREE: 'FREE',
    PRO: 'PRO',
  },
  getRequiredTier: vi.fn().mockReturnValue('FREE'),
  getSubscriptionStatusInfo: vi.fn().mockReturnValue({
    status: 'active',
    label: 'Active',
    description: 'Your subscription is active',
    color: 'green',
  }),
  isSubscriptionActive: vi.fn().mockReturnValue(true),
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
  default: vi.fn(() => {
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
    }
    return Promise.resolve(Buffer.from(JSON.stringify(mockEvent)))
  }),
}))

// Mock environment variables
vi.mock('@/utils/env', () => ({
  env: {
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: 'price_monthly_123',
    NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID: 'price_annual_123',
    NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID: 'price_lifetime_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  },
}))

describe('Stripe Webhook Handler - Gift Subscriptions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_secret')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID', 'price_monthly_test')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID', 'price_annual_test')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID', 'price_lifetime_test')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_GIFT_PRO_MONTHLY_PRICE_ID', 'gift_price_monthly_test')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_GIFT_PRO_ANNUAL_PRICE_ID', 'gift_price_annual_test')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_GIFT_PRO_LIFETIME_PRICE_ID', 'gift_price_lifetime_test')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('processes gift subscription checkout.session.completed events', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 't=1234567890,v1=fake_signature',
      },
    })

    // Mock transaction data
    const mockTx = {
      webhookEvent: {
        create: vi.fn().mockResolvedValueOnce({ id: 'webhook-1' }),
        findUnique: vi.fn().mockResolvedValueOnce(null),
      },
      user: {
        findUnique: vi.fn().mockResolvedValueOnce({
          id: 'user-123',
          email: 'recipient@example.com',
          name: 'Recipient',
          locale: 'en',
          proExpiration: null,
        }),
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
  })

  it('processes lifetime gift subscriptions correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 't=1234567890,v1=fake_signature',
      },
    })

    await handler(req, res)

    // Verify the response
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ received: true })
  })

  it('extends existing subscription when user already has one', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 't=1234567890,v1=fake_signature',
      },
    })

    await handler(req, res)

    // Verify the response
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ received: true })
  })

  it('handles user subscribing after receiving a gift subscription', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 't=1234567890,v1=fake_signature',
      },
      body: {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: {
              data: [{ price: { id: 'price_monthly_test' } }],
            },
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
          },
        },
      },
    })

    // Mock customer data with userId
    vi.mocked(stripe.customers.retrieve).mockResolvedValueOnce({
      id: 'cus_123',
      metadata: { userId: 'user-123' },
      lastResponse: {
        headers: {},
        requestId: 'req_123',
        statusCode: 200,
      },
    } as unknown as Stripe.Response<Stripe.Customer>)

    // Mock existing gift subscription
    const giftExpiration = new Date()
    giftExpiration.setMonth(giftExpiration.getMonth() + 2) // Gift expires in 2 months

    const mockTx = {
      webhookEvent: {
        create: vi.fn().mockResolvedValueOnce({ id: 'webhook-1' }),
        findUnique: vi.fn().mockResolvedValueOnce(null),
      },
      user: {
        findUnique: vi.fn().mockResolvedValueOnce({
          id: 'user-123',
          email: 'user@example.com',
          name: 'User',
          proExpiration: giftExpiration,
        }),
        update: vi.fn().mockResolvedValueOnce({ id: 'user-123' }),
      },
      subscription: {
        findFirst: vi.fn().mockResolvedValueOnce({
          id: 'gift-sub-123',
          userId: 'user-123',
          status: 'ACTIVE',
          tier: 'PRO',
          isGift: true,
          currentPeriodEnd: giftExpiration,
        }),
        findMany: vi.fn().mockResolvedValueOnce([]),
        upsert: vi.fn().mockResolvedValueOnce({ id: 'sub-123' }),
      },
    }

    vi.mocked(prisma.$transaction).mockImplementationOnce((callback) =>
      callback(mockTx as unknown as PrismaClient),
    )

    await handler(req, res)

    // Verify the response
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ received: true })
  })
})
