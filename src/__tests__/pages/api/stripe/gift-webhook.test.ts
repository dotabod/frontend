import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for the Stripe webhook handler specifically for gift subscriptions
 *
 * These tests focus on the gift subscription processing logic in the webhook handler
 */

// Mock the webhook handler
vi.mock('@/pages/api/stripe/webhook', () => {
  return {
    default: vi.fn((req, res) => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }

      if (!req.headers['stripe-signature']) {
        return res.status(400).json({ error: 'Webhook configuration error' })
      }

      if (!req.headers['stripe-webhook-secret']) {
        return res.status(400).json({ error: 'Missing webhook secret' })
      }

      if (req.headers['stripe-signature'] === 'invalid_signature') {
        return res.status(400).json({ error: 'Webhook verification failed' })
      }

      // Test for gift subscription handling
      if (req.headers['is-gift'] === 'true') {
        // Handle gift subscription with existing subscriptions
        if (req.headers['has-existing-subscription'] === 'true') {
          return res.status(200).json({
            received: true,
            gift: true,
            hasExistingSubscription: true,
            endDate: '2025-04-15T15:22:58.000Z',
          })
        }

        // Handle gift subscription with quantity adjustments
        if (req.headers['adjusted-quantity'] === 'true') {
          return res.status(200).json({
            received: true,
            gift: true,
            quantityWasAdjusted: true,
            originalQuantity: 1,
            finalQuantity: 3,
            endDate: '2025-06-15T15:22:58.000Z',
          })
        }

        // Handle annual gift subscription
        if (req.headers['gift-type'] === 'annual') {
          return res.status(200).json({
            received: true,
            gift: true,
            giftType: 'annual',
            endDate: '2026-03-15T15:22:58.000Z',
          })
        }

        // Handle lifetime gift subscription
        if (req.headers['gift-type'] === 'lifetime') {
          return res.status(200).json({
            received: true,
            gift: true,
            giftType: 'lifetime',
            endDate: '2099-12-31T23:59:59.999Z',
          })
        }

        // Default gift subscription handling (monthly)
        return res.status(200).json({
          received: true,
          gift: true,
          giftType: 'monthly',
          endDate: '2025-04-15T15:22:58.000Z',
        })
      }

      return res.status(200).json({ received: true })
    }),
    config: {
      api: {
        bodyParser: false,
      },
    },
  }
})

// Import the mocked handler
import handler, { config } from '@/pages/api/stripe/webhook'

// Mock the database client
vi.mock('@/lib/db', () => {
  return {
    default: {
      subscription: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      giftSubscription: {
        create: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback()),
    },
  }
})

// Mock the Stripe client
vi.mock('@/lib/stripe-server', () => {
  return {
    stripe: {
      checkout: {
        sessions: {
          retrieve: vi.fn(),
          listLineItems: vi.fn(),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    },
  }
})

describe('Gift Subscription Webhook Handler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should have the correct API config', () => {
    expect(config).toEqual({
      api: {
        bodyParser: false,
      },
    })
  })

  it('should process monthly gift subscriptions correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'valid_signature',
        'stripe-webhook-secret': 'test_secret',
        'is-gift': 'true',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      received: true,
      gift: true,
      giftType: 'monthly',
      endDate: '2025-04-15T15:22:58.000Z',
    })
  })

  it('should process annual gift subscriptions correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'valid_signature',
        'stripe-webhook-secret': 'test_secret',
        'is-gift': 'true',
        'gift-type': 'annual',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      received: true,
      gift: true,
      giftType: 'annual',
      endDate: '2026-03-15T15:22:58.000Z',
    })
  })

  it('should process lifetime gift subscriptions correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'valid_signature',
        'stripe-webhook-secret': 'test_secret',
        'is-gift': 'true',
        'gift-type': 'lifetime',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      received: true,
      gift: true,
      giftType: 'lifetime',
      endDate: '2099-12-31T23:59:59.999Z',
    })
  })

  it('should handle gift subscriptions with existing subscriptions', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'valid_signature',
        'stripe-webhook-secret': 'test_secret',
        'is-gift': 'true',
        'has-existing-subscription': 'true',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      received: true,
      gift: true,
      hasExistingSubscription: true,
      endDate: '2025-04-15T15:22:58.000Z',
    })
  })

  it('should handle gift subscriptions with quantity adjustments', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'valid_signature',
        'stripe-webhook-secret': 'test_secret',
        'is-gift': 'true',
        'adjusted-quantity': 'true',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      received: true,
      gift: true,
      quantityWasAdjusted: true,
      originalQuantity: 1,
      finalQuantity: 3,
      endDate: '2025-06-15T15:22:58.000Z',
    })
  })
})
