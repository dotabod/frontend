import type { GiftSubscription, Subscription, User } from '@prisma/client'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
      where: {
        userId: 'user-123',
        isGift: true,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        giftDetails: true,
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      hasGifts: false,
      giftCount: 0,
      hasLifetime: false,
      giftMessage: '',
      giftSubscriptions: [],
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
        id: 'sub-123',
        userId: 'user-123',
        stripeCustomerId: null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        tier: 'PRO',
        status: 'ACTIVE',
        transactionType: 'RECURRING',
        currentPeriodEnd: endDate,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isGift: true,
        metadata: {},
        giftDetails: {
          id: 'gift-123',
          subscriptionId: 'sub-123',
          senderName: 'John Doe',
          giftType: 'monthly',
          giftQuantity: 1,
          giftMessage: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GiftSubscription,
      } as Subscription,
    ])

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-123',
      name: 'Test User',
      displayName: null,
      email: null,
      image: null,
      mmr: 0,
      steam32Id: null,
      followers: null,
      stream_delay: null,
      emailVerified: null,
      stream_online: false,
      stream_start_date: null,
      beta_tester: false,
      locale: 'en',
      kick: null,
      youtube: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      proExpiration: endDate,
    } as User)

    await handler(req, res)

    expect(res.statusCode).toBe(200)

    const responseData = res._getJSONData()
    expect(responseData).toEqual({
      hasGifts: true,
      giftCount: 1,
      hasLifetime: false,
      giftMessage: `Your Pro subscription is active until ${endDate.toLocaleDateString()}`,
      giftSubscriptions: [
        {
          id: 'sub-123',
          endDate: endDate.toISOString(),
          senderName: 'John Doe',
          giftType: 'monthly',
          giftQuantity: 1,
          giftMessage: '',
          createdAt: expect.any(String),
        },
      ],
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
        id: 'sub-123',
        userId: 'user-123',
        stripeCustomerId: null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        tier: 'PRO',
        status: 'ACTIVE',
        transactionType: 'RECURRING',
        currentPeriodEnd: endDate1,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isGift: true,
        metadata: {},
        giftDetails: {
          id: 'gift-123',
          subscriptionId: 'sub-123',
          senderName: 'John Doe',
          giftType: 'monthly',
          giftQuantity: 1,
          giftMessage: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GiftSubscription,
      } as Subscription,
      {
        id: 'sub-456',
        userId: 'user-123',
        stripeCustomerId: null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        tier: 'PRO',
        status: 'ACTIVE',
        transactionType: 'RECURRING',
        currentPeriodEnd: endDate2,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isGift: true,
        metadata: {},
        giftDetails: {
          id: 'gift-456',
          subscriptionId: 'sub-456',
          senderName: 'Jane Smith',
          giftType: 'monthly',
          giftQuantity: 1,
          giftMessage: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GiftSubscription,
      } as Subscription,
    ])

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-123',
      name: 'Test User',
      displayName: null,
      email: null,
      image: null,
      mmr: 0,
      steam32Id: null,
      followers: null,
      stream_delay: null,
      emailVerified: null,
      stream_online: false,
      stream_start_date: null,
      beta_tester: false,
      locale: 'en',
      kick: null,
      youtube: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      proExpiration: endDate1,
    } as User)

    await handler(req, res)

    expect(res.statusCode).toBe(200)

    const responseData = res._getJSONData()
    expect(responseData).toEqual({
      hasGifts: true,
      giftCount: 2,
      hasLifetime: false,
      giftMessage: `Your Pro subscription is active until ${endDate1.toLocaleDateString()}`,
      giftSubscriptions: [
        {
          id: 'sub-123',
          endDate: endDate1.toISOString(),
          senderName: 'John Doe',
          giftType: 'monthly',
          giftQuantity: 1,
          giftMessage: '',
          createdAt: expect.any(String),
        },
        {
          id: 'sub-456',
          endDate: endDate2.toISOString(),
          senderName: 'Jane Smith',
          giftType: 'monthly',
          giftQuantity: 1,
          giftMessage: '',
          createdAt: expect.any(String),
        },
      ],
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
        id: 'sub-123',
        userId: 'user-123',
        stripeCustomerId: null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        tier: 'PRO',
        status: 'ACTIVE',
        transactionType: 'RECURRING',
        currentPeriodEnd: endDate,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isGift: true,
        metadata: {},
        giftDetails: null,
      } as Subscription,
    ])

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-123',
      name: 'Test User',
      displayName: null,
      email: null,
      image: null,
      mmr: 0,
      steam32Id: null,
      followers: null,
      stream_delay: null,
      emailVerified: null,
      stream_online: false,
      stream_start_date: null,
      beta_tester: false,
      locale: 'en',
      kick: null,
      youtube: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      proExpiration: endDate,
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
