import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/test-gift-notification'
import type { SubscriptionStatus, SubscriptionTier } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/api-middlewares/with-authentication', () => ({
  withAuthentication: (fn) => fn,
}))

vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (methods, fn) => fn,
}))

vi.mock('@/lib/api/getServerSession', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  default: {
    subscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    giftSubscription: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
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
      id: 'sub-123',
      userId: 'user-123',
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: 'PRO' as SubscriptionTier,
      status: 'ACTIVE' as SubscriptionStatus,
      transactionType: 'RECURRING',
      currentPeriodEnd: mockDate,
      cancelAtPeriodEnd: false,
      createdAt: mockDate,
      updatedAt: mockDate,
      isGift: true,
    })

    vi.mocked(prisma.giftSubscription.create).mockResolvedValue({
      id: 'gift-123',
      subscriptionId: 'sub-123',
      senderName: 'Test Sender',
      giftMessage: 'This is a test gift message. Enjoy your subscription!',
      giftType: 'monthly',
      giftQuantity: 1,
      createdAt: mockDate,
      updatedAt: mockDate,
    })

    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: 'notification-123',
      userId: 'user-123',
      type: 'GIFT_SUBSCRIPTION',
      isRead: false,
      giftSubscriptionId: 'gift-123',
      createdAt: mockDate,
      updatedAt: mockDate,
    })
  })

  it('returns 403 in production environment', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({
      message: 'This endpoint is only available in development mode',
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
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        twitchId: 'twitch-123',
        role: ['user'],
        locale: 'en',
        scope: 'user',
      },
      expires: '',
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
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        twitchId: 'twitch-123',
        role: ['admin'],
        locale: 'en',
        scope: 'user',
      },
      expires: '',
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
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        twitchId: 'twitch-123',
        role: ['admin'],
        locale: 'en',
        scope: 'user',
      },
      expires: '',
    })

    const { req, res } = createMocks({
      method: 'POST',
      query: {
        giftType: 'monthly',
      },
      body: {
        giftQuantity: '-1',
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
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        twitchId: 'twitch-123',
        role: ['admin'],
        locale: 'en',
        scope: 'user',
      },
      expires: '',
    })

    const mockDate = new Date()
    vi.mocked(prisma.giftSubscription.create).mockResolvedValue({
      id: 'gift-123',
      subscriptionId: 'sub-123',
      senderName: 'Test Sender',
      giftMessage: 'This is a test gift message. Enjoy your subscription!',
      giftType: 'monthly',
      giftQuantity: 2,
      createdAt: mockDate,
      updatedAt: mockDate,
    })

    const { req, res } = createMocks({
      method: 'POST',
      query: {
        giftType: 'monthly',
      },
      body: {
        giftQuantity: '2',
        giftMessage: 'This is a test gift message. Enjoy your subscription!',
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
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        twitchId: 'twitch-123',
        role: ['admin'],
        locale: 'en',
        scope: 'user',
      },
      expires: '',
    })

    const mockDate = new Date()
    vi.mocked(prisma.giftSubscription.create).mockResolvedValue({
      id: 'gift-123',
      subscriptionId: 'sub-123',
      senderName: 'Test Sender',
      giftMessage: 'This is a test gift message. Enjoy your subscription!',
      giftType: 'lifetime',
      giftQuantity: 1,
      createdAt: mockDate,
      updatedAt: mockDate,
    })
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      {
        id: 'sub-1234',
        userId: 'user-123',
        status: 'ACTIVE',
        isGift: true,
        createdAt: mockDate,
        updatedAt: mockDate,
        stripeCustomerId: null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        tier: 'PRO',
        transactionType: 'LIFETIME',
        currentPeriodEnd: mockDate,
        cancelAtPeriodEnd: false,
        giftDetails: {
          id: 'gift-details-123',
          subscriptionId: 'sub-1234',
          senderName: 'Test Sender',
          giftMessage: 'This is a test gift message',
          giftType: 'lifetime',
          giftQuantity: 1,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      } as any,
    ])

    const { req, res } = createMocks({
      method: 'POST',
      query: {
        giftType: 'lifetime',
      },
      body: {
        giftMessage: 'This is a test gift message. Enjoy your subscription!',
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
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        twitchId: 'twitch-123',
        role: ['admin'],
        locale: 'en',
        scope: 'user',
      },
      expires: '',
    })

    // Mock console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mockDate = new Date()
    // Mock existing lifetime subscription
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: 'existing-sub-123',
      userId: 'user-123',
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: 'PRO' as SubscriptionTier,
      status: 'ACTIVE' as SubscriptionStatus,
      transactionType: 'LIFETIME',
      currentPeriodEnd: mockDate,
      cancelAtPeriodEnd: false,
      createdAt: mockDate,
      updatedAt: mockDate,
      isGift: true,
    })

    vi.mocked(prisma.giftSubscription.create).mockResolvedValue({
      id: 'gift-123',
      subscriptionId: 'sub-123',
      senderName: 'Test Sender',
      giftMessage: 'This is a test gift message. Enjoy your subscription!',
      giftType: 'lifetime',
      giftQuantity: 1,
      createdAt: mockDate,
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
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.png',
        isImpersonating: false,
        twitchId: 'twitch-123',
        role: ['admin'],
        locale: 'en',
        scope: 'user',
      },
      expires: '',
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
