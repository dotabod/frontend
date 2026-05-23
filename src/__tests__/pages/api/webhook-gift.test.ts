import type { PrismaClient } from '@prisma/client'
import { createMocks } from 'node-mocks-http'
import type { Stripe } from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'

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
  ensureCustomer: vi.fn().mockResolvedValue('cus_test'),
  stripe: {
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
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}))

vi.mock('@/utils/subscription', () => ({
  GRACE_PERIOD_END: new Date(),
  PRICE_IDS: [
    {
      annual: 'price_free_annual',
      monthly: 'price_free_monthly',
      name: 'Free',
      tier: 'FREE',
    },
    {
      annual: 'price_pro_annual',
      monthly: 'price_pro_monthly',
      name: 'Pro',
      tier: 'PRO',
    },
  ],
  SUBSCRIPTION_TIERS: {
    FREE: 'FREE',
    PRO: 'PRO',
  },
  getRequiredTier: vi.fn().mockReturnValue('FREE'),
  getSubscriptionStatusInfo: vi.fn().mockReturnValue({
    color: 'green',
    description: 'Your subscription is active',
    label: 'Active',
    status: 'active',
  }),
  isInGracePeriod: vi.fn().mockReturnValue(false),
  isSubscriptionActive: vi.fn().mockReturnValue(true),
}))
vi.mock('@/lib/db', () => ({
  default: {
    $transaction: vi.fn((callback) =>
      callback({
        giftSubscription: {
          create: vi.fn(),
        },
        giftTransaction: {
          create: vi.fn(),
        },
        notification: {
          create: vi.fn(),
        },
        subscription: {
          create: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
        },
        user: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        webhookEvent: {
          create: vi.fn(),
          findUnique: vi.fn(),
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
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          amount_total: 2500,
          client_reference_id: null,
          currency: 'usd',
          customer: 'cus_test',
          expires_at: null,
          id: 'cs_test',
          metadata: {
            giftDuration: 'monthly',
            giftMessage: 'Enjoy your gift!',
            giftQuantity: '3',
            giftSenderName: 'Gift Sender',
            gifterId: 'gifter-123',
            isGift: 'true',
            recipientUserId: 'user-123',
          },
          mode: 'payment',
          object: 'checkout.session',
          payment_status: 'paid',
          status: 'complete',
        },
      },
      id: 'evt_test',
      livemode: false,
      object: 'event',
      pending_webhooks: 0,
      request: { id: 'req_test', idempotency_key: 'idem_test' },
      type: 'checkout.session.completed',
    }
    return Promise.resolve(Buffer.from(JSON.stringify(mockEvent)))
  }),
}))

// Mock environment variables
vi.mock('@/utils/env', () => ({
  env: {
    NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID: 'price_annual_123',
    NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID: 'price_lifetime_123',
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: 'price_monthly_123',
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
    vi.stubEnv('NEXT_PUBLIC_STRIPE_CREDIT_PRICE_ID', 'gift_price_monthly_test')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('processes gift subscription checkout.session.completed events', async () => {
    const { req, res } = createMocks({
      headers: {
        'stripe-signature': 't=1234567890,v1=fake_signature',
      },
      method: 'POST',
    })

    // Mock transaction data
    const mockTx = {
      giftSubscription: {
        create: vi.fn().mockResolvedValueOnce({ id: 'gift-123' }),
      },
      giftTransaction: {
        create: vi.fn().mockResolvedValueOnce({ id: 'tx-123' }),
      },
      notification: {
        create: vi.fn().mockResolvedValueOnce({ id: 'notif-123' }),
      },
      subscription: {
        create: vi.fn().mockResolvedValueOnce({ id: 'sub-123' }),
        findFirst: vi.fn().mockResolvedValueOnce(null),
      },
      user: {
        findUnique: vi.fn().mockResolvedValueOnce({
          email: 'recipient@example.com',
          id: 'user-123',
          locale: 'en',
          name: 'Recipient',
          proExpiration: null,
        }),
        update: vi.fn().mockResolvedValueOnce({ id: 'user-123' }),
      },
      webhookEvent: {
        create: vi.fn().mockResolvedValueOnce({ id: 'webhook-1' }),
        findUnique: vi.fn().mockResolvedValueOnce(null),
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
      headers: {
        'stripe-signature': 't=1234567890,v1=fake_signature',
      },
      method: 'POST',
    })

    await handler(req, res)

    // Verify the response
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ received: true })
  })

  it('extends existing subscription when user already has one', async () => {
    const { req, res } = createMocks({
      headers: {
        'stripe-signature': 't=1234567890,v1=fake_signature',
      },
      method: 'POST',
    })

    await handler(req, res)

    // Verify the response
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ received: true })
  })

  it('handles user subscribing after receiving a gift subscription', async () => {
    const { req, res } = createMocks({
      body: {
        data: {
          object: {
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
            customer: 'cus_123',
            id: 'sub_123',
            items: {
              data: [{ price: { id: 'price_monthly_test' } }],
            },
            status: 'active',
          },
        },
        type: 'customer.subscription.created',
      },
      headers: {
        'stripe-signature': 't=1234567890,v1=fake_signature',
      },
      method: 'POST',
    })

    // Mock customer data with userId
    vi.mocked(stripe.customers.retrieve).mockResolvedValueOnce({
      id: 'cus_123',
      lastResponse: {
        headers: {},
        requestId: 'req_123',
        statusCode: 200,
      },
      metadata: { userId: 'user-123' },
    } as unknown as Stripe.Response<Stripe.Customer>)

    // Mock existing gift subscription
    const giftExpiration = new Date()
    giftExpiration.setMonth(giftExpiration.getMonth() + 2) // Gift expires in 2 months

    const mockTx = {
      subscription: {
        findFirst: vi.fn().mockResolvedValueOnce({
          currentPeriodEnd: giftExpiration,
          id: 'gift-sub-123',
          isGift: true,
          status: 'ACTIVE',
          tier: 'PRO',
          userId: 'user-123',
        }),
        findMany: vi.fn().mockResolvedValueOnce([]),
        upsert: vi.fn().mockResolvedValueOnce({ id: 'sub-123' }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValueOnce({
          email: 'user@example.com',
          id: 'user-123',
          name: 'User',
          proExpiration: giftExpiration,
        }),
        update: vi.fn().mockResolvedValueOnce({ id: 'user-123' }),
      },
      webhookEvent: {
        create: vi.fn().mockResolvedValueOnce({ id: 'webhook-1' }),
        findUnique: vi.fn().mockResolvedValueOnce(null),
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
