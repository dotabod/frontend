import type { GiftSubscription, Subscription, User } from '@prisma/client'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import handler from '@/pages/api/user/gift-subscriptions'

// Mock prisma
vi.mock('@/lib/db', () => ({
  default: {
    subscription: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Mock formatDate
vi.mock('@/utils/formatDate', () => ({
  formatDate: vi.fn((_date) => '2025-01-01'),
}))

import { getServerSession } from 'next-auth'
// Import mocked modules
import prisma from '@/lib/db'

describe('gift-subscriptions API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(405)
    expect(res._getJSONData()).toEqual({ error: 'Method not allowed' })
  })

  it('returns 401 for unauthenticated requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock session to return null (unauthenticated)
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    await handler(req, res)

    expect(getServerSession).toHaveBeenCalled()
    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
  })

  it('returns no gifts when user has no gift subscriptions', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock authenticated session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'user-123' },
    })

    // Mock empty subscription list
    vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([])

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      proExpiration: null,
    } as User)

    await handler(req, res)

    expect(getServerSession).toHaveBeenCalled()
    expect(prisma.subscription.findMany).toHaveBeenCalledWith({
      include: {
        giftDetails: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        isGift: true,
        status: 'ACTIVE',
        userId: 'user-123',
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      giftCount: 0,
      giftMessage: '',
      giftSubscriptions: [],
      hasGifts: false,
      hasLifetime: false,
    })
  })

  it('returns single gift subscription details', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock authenticated session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'user-123' },
    })

    const endDate = new Date('2025-01-01')

    // Mock single subscription
    vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
      {
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        currentPeriodEnd: endDate,
        giftDetails: {
          createdAt: new Date(),
          giftMessage: '',
          giftQuantity: 1,
          giftType: 'monthly',
          id: 'gift-123',
          senderName: 'John Doe',
          subscriptionId: 'sub-123',
          updatedAt: new Date(),
        } as GiftSubscription,
        id: 'sub-123',
        isGift: true,
        metadata: {},
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        tier: 'PRO',
        transactionType: 'RECURRING',
        updatedAt: new Date(),
        userId: 'user-123',
      } as Subscription,
    ])

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      beta_tester: false,
      createdAt: new Date(),
      displayName: null,
      email: null,
      emailVerified: null,
      followers: null,
      id: 'user-123',
      image: null,
      kick: null,
      locale: 'en',
      mmr: 0,
      name: 'Test User',
      proExpiration: endDate,
      steam32Id: null,
      stream_delay: null,
      stream_online: false,
      stream_start_date: null,
      updatedAt: new Date(),
      youtube: null,
    } as User)

    await handler(req, res)

    expect(res.statusCode).toBe(200)

    const responseData = res._getJSONData()
    expect(responseData).toEqual({
      giftCount: 1,
      giftMessage: `Your Pro subscription is active until ${endDate.toLocaleDateString()}`,
      giftSubscriptions: [
        {
          createdAt: expect.any(String),
          endDate: endDate.toISOString(),
          giftMessage: '',
          giftQuantity: 1,
          giftType: 'monthly',
          id: 'sub-123',
          senderName: 'John Doe',
        },
      ],
      hasGifts: true,
      hasLifetime: false,
    })
  })

  it('returns multiple gift subscription details', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock authenticated session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'user-123' },
    })

    const endDate1 = new Date('2025-01-01')
    const endDate2 = new Date('2024-12-01')

    // Mock multiple subscriptions
    vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
      {
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        currentPeriodEnd: endDate1,
        giftDetails: {
          createdAt: new Date(),
          giftMessage: '',
          giftQuantity: 1,
          giftType: 'monthly',
          id: 'gift-123',
          senderName: 'John Doe',
          subscriptionId: 'sub-123',
          updatedAt: new Date(),
        } as GiftSubscription,
        id: 'sub-123',
        isGift: true,
        metadata: {},
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        tier: 'PRO',
        transactionType: 'RECURRING',
        updatedAt: new Date(),
        userId: 'user-123',
      } as Subscription,
      {
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        currentPeriodEnd: endDate2,
        giftDetails: {
          createdAt: new Date(),
          giftMessage: '',
          giftQuantity: 1,
          giftType: 'monthly',
          id: 'gift-456',
          senderName: 'Jane Smith',
          subscriptionId: 'sub-456',
          updatedAt: new Date(),
        } as GiftSubscription,
        id: 'sub-456',
        isGift: true,
        metadata: {},
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        tier: 'PRO',
        transactionType: 'RECURRING',
        updatedAt: new Date(),
        userId: 'user-123',
      } as Subscription,
    ])

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      beta_tester: false,
      createdAt: new Date(),
      displayName: null,
      email: null,
      emailVerified: null,
      followers: null,
      id: 'user-123',
      image: null,
      kick: null,
      locale: 'en',
      mmr: 0,
      name: 'Test User',
      proExpiration: endDate1,
      steam32Id: null,
      stream_delay: null,
      stream_online: false,
      stream_start_date: null,
      updatedAt: new Date(),
      youtube: null,
    } as User)

    await handler(req, res)

    expect(res.statusCode).toBe(200)

    const responseData = res._getJSONData()
    expect(responseData).toEqual({
      giftCount: 2,
      giftMessage: `Your Pro subscription is active until ${endDate1.toLocaleDateString()}`,
      giftSubscriptions: [
        {
          createdAt: expect.any(String),
          endDate: endDate1.toISOString(),
          giftMessage: '',
          giftQuantity: 1,
          giftType: 'monthly',
          id: 'sub-123',
          senderName: 'John Doe',
        },
        {
          createdAt: expect.any(String),
          endDate: endDate2.toISOString(),
          giftMessage: '',
          giftQuantity: 1,
          giftType: 'monthly',
          id: 'sub-456',
          senderName: 'Jane Smith',
        },
      ],
      hasGifts: true,
      hasLifetime: false,
    })
  })

  it('handles anonymous gift senders', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock authenticated session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'user-123' },
    })

    const endDate = new Date('2025-01-01')

    // Mock subscription with no sender name
    vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
      {
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        currentPeriodEnd: endDate,
        giftDetails: null,
        id: 'sub-123',
        isGift: true,
        metadata: {},
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        tier: 'PRO',
        transactionType: 'RECURRING',
        updatedAt: new Date(),
        userId: 'user-123',
      } as Subscription,
    ])

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      beta_tester: false,
      createdAt: new Date(),
      displayName: null,
      email: null,
      emailVerified: null,
      followers: null,
      id: 'user-123',
      image: null,
      kick: null,
      locale: 'en',
      mmr: 0,
      name: 'Test User',
      proExpiration: endDate,
      steam32Id: null,
      stream_delay: null,
      stream_online: false,
      stream_start_date: null,
      updatedAt: new Date(),
      youtube: null,
    } as User)

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData.giftSubscriptions[0].senderName).toBe('Anonymous')
  })

  it('handles database errors correctly', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock authenticated session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'user-123' },
    })

    // Mock database error
    const mockError = new Error('Database error')
    vi.mocked(prisma.subscription.findMany).mockRejectedValueOnce(mockError)

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({ error: 'Failed to fetch gift subscriptions' })
  })
})
