// @ts-nocheck
import type { GiftSubscription, SubscriptionStatus, SubscriptionTier } from '@prisma/client'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import handler from '@/pages/api/test-gift-notification'

// Mock dependencies
vi.mock('@/lib/api-middlewares/with-authentication', () => ({
  withAuthentication: (fn) => fn,
}))

vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods, fn) => fn,
}))

vi.mock('@/lib/api/getServerSession', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  default: {
    giftSubscription: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

// Import the mocked dependencies
import { getServerSession } from '@/lib/api/getServerSession'
import prisma from '@/lib/db'

describe('test-gift-notification API', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Mock process.env
    vi.stubEnv('NODE_ENV', 'development')

    // Setup default mock returns
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([])

    const mockDate = new Date()
    vi.mocked(prisma.subscription.create).mockResolvedValue({
      cancelAtPeriodEnd: false,
      createdAt: mockDate,
      currentPeriodEnd: mockDate,
      id: 'sub-123',
      isGift: true,
      metadata: null,
      status: 'ACTIVE' as SubscriptionStatus,
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: 'PRO' as SubscriptionTier,
      transactionType: 'RECURRING',
      updatedAt: mockDate,
      userId: 'user-123',
    })

    vi.mocked(prisma.giftSubscription.create).mockResolvedValue({
      createdAt: mockDate,
      giftMessage: 'This is a test gift message. Enjoy your subscription!',
      giftQuantity: 1,
      giftType: 'monthly',
      gifterId: null,
      id: 'gift-123',
      senderName: 'Test Sender',
      subscriptionId: 'sub-123',
      updatedAt: mockDate,
    })

    vi.mocked(prisma.notification.create).mockResolvedValue({
      createdAt: mockDate,
      giftSubscriptionId: 'gift-123',
      id: 'notification-123',
      isRead: false,
      type: 'GIFT_SUBSCRIPTION',
      updatedAt: mockDate,
      userId: 'user-123',
    })
  })

  it('returns 401 in production environment', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({
      message: 'Unauthorized',
    })
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({ message: 'Unauthorized' })
  })

  it('returns 401 when user is not an admin', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      expires: '',
      user: {
        email: 'test@example.com',
        id: 'user-123',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        locale: 'en',
        name: 'Test User',
        role: 'user',
        scope: 'user',
        twitchId: 'twitch-123',
      },
    })

    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 for invalid gift type', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      expires: '',
      user: {
        email: 'test@example.com',
        id: 'user-123',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        locale: 'en',
        name: 'Test User',
        role: 'admin',
        scope: 'user',
        twitchId: 'twitch-123',
      },
    })

    const { req, res } = createMocks({
      method: 'POST',
      query: {
        giftType: 'invalid-type',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({
      message: 'Invalid gift type. Must be monthly, annual, or lifetime',
    })
  })

  it('returns 400 for invalid gift quantity', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      expires: '',
      user: {
        email: 'test@example.com',
        id: 'user-123',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        locale: 'en',
        name: 'Test User',
        role: 'admin',
        scope: 'user',
        twitchId: 'twitch-123',
      },
    })

    const { req, res } = createMocks({
      body: {
        giftQuantity: '-1',
      },
      method: 'POST',
      query: {
        giftType: 'monthly',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({
      message: 'Gift quantity must be a positive number',
    })
  })

  it('successfully creates a monthly gift notification', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      expires: '',
      user: {
        email: 'test@example.com',
        id: 'user-123',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        locale: 'en',
        name: 'Test User',
        role: 'admin',
        scope: 'user',
        twitchId: 'twitch-123',
      },
    })

    const mockDate = new Date()
    vi.mocked(prisma.giftSubscription.create).mockResolvedValue({
      createdAt: mockDate,
      giftMessage: 'This is a test gift message. Enjoy your subscription!',
      giftQuantity: 2,
      giftType: 'monthly',
      gifterId: null,
      id: 'gift-123',
      senderName: 'Test Sender',
      subscriptionId: 'sub-123',
      updatedAt: mockDate,
    })

    const { req, res } = createMocks({
      body: {
        giftMessage: 'This is a test gift message. Enjoy your subscription!',
        giftQuantity: '2',
      },
      method: 'POST',
      query: {
        giftType: 'monthly',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData.success).toBe(true)
    expect(responseData.message).toBe('Test gift notification created')
    expect(responseData.notification.id).toBe('notification-123')
    expect(responseData.giftSubscription.giftType).toBe('monthly')
    expect(responseData.giftSubscription.giftQuantity).toBe(2)
    expect(responseData.totalGiftedMonths).toBe(0)
    expect(responseData.hasLifetime).toBe(false)
  })

  it('successfully creates a lifetime gift notification', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      expires: '',
      user: {
        email: 'test@example.com',
        id: 'user-123',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        locale: 'en',
        name: 'Test User',
        role: 'admin',
        scope: 'user',
        twitchId: 'twitch-123',
      },
    })

    const mockDate = new Date()
    vi.mocked(prisma.giftSubscription.create).mockResolvedValue({
      createdAt: mockDate,
      giftMessage: 'This is a test gift message. Enjoy your subscription!',
      giftQuantity: 1,
      giftType: 'lifetime',
      gifterId: null,
      id: 'gift-123',
      senderName: 'Test Sender',
      subscriptionId: 'sub-123',
      updatedAt: mockDate,
    })
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      {
        cancelAtPeriodEnd: false,
        createdAt: mockDate,
        currentPeriodEnd: mockDate,
        giftDetails: {
          createdAt: mockDate,
          giftMessage: 'This is a test gift message',
          giftQuantity: 1,
          giftType: 'lifetime',
          id: 'gift-details-123',
          senderName: 'Test Sender',
          subscriptionId: 'sub-1234',
          updatedAt: mockDate,
        } as GiftSubscription,
        id: 'sub-1234',
        isGift: true,
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        tier: 'PRO',
        transactionType: 'LIFETIME',
        updatedAt: mockDate,
        userId: 'user-123',
      },
    ])

    const { req, res } = createMocks({
      body: {
        giftMessage: 'This is a test gift message. Enjoy your subscription!',
      },
      method: 'POST',
      query: {
        giftType: 'lifetime',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData.success).toBe(true)
    expect(responseData.message).toBe('Test gift notification created')
    expect(responseData.notification.id).toBe('notification-123')
    expect(responseData.giftSubscription.giftType).toBe('lifetime')
    expect(responseData.giftSubscription.giftQuantity).toBe(1)
    expect(responseData.totalGiftedMonths).toBe('lifetime')
    expect(responseData.hasLifetime).toBe(true)
  })

  it('handles existing lifetime subscription', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      expires: '',
      user: {
        email: 'test@example.com',
        id: 'user-123',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        locale: 'en',
        name: 'Test User',
        role: 'admin',
        scope: 'user',
        twitchId: 'twitch-123',
      },
    })

    // Mock console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mockDate = new Date()
    // Mock existing lifetime subscription
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      cancelAtPeriodEnd: false,
      createdAt: mockDate,
      currentPeriodEnd: mockDate,
      id: 'existing-sub-123',
      isGift: true,
      metadata: null,
      status: 'ACTIVE' as SubscriptionStatus,
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: 'PRO' as SubscriptionTier,
      transactionType: 'LIFETIME',
      updatedAt: mockDate,
      userId: 'user-123',
    })

    vi.mocked(prisma.giftSubscription.create).mockResolvedValue({
      createdAt: mockDate,
      giftMessage: 'This is a test gift message. Enjoy your subscription!',
      giftQuantity: 1,
      giftType: 'lifetime',
      gifterId: null,
      id: 'gift-123',
      senderName: 'Test Sender',
      subscriptionId: 'sub-123',
      updatedAt: mockDate,
    })

    const { req, res } = createMocks({
      method: 'POST',
      query: {
        giftType: 'lifetime',
      },
    })

    await handler(req, res)

    expect(consoleWarnSpy).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData.success).toBe(true)
  })

  it('handles server error', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      expires: '',
      user: {
        email: 'test@example.com',
        id: 'user-123',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        locale: 'en',
        name: 'Test User',
        role: 'admin',
        scope: 'user',
        twitchId: 'twitch-123',
      },
    })

    // Mock console.error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Force an error
    vi.mocked(prisma.subscription.create).mockRejectedValue(new Error('Database error'))

    const { req, res } = createMocks({
      method: 'POST',
      query: {
        giftType: 'monthly',
      },
    })

    await handler(req, res)

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData().message).toBe('Internal server error')
  })
})
