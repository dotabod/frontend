import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import handler from '../user/pro-status'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/db'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
    },
  },
}))

describe('Pro Status API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 405 for non-GET requests', async () => {
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

    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 404 if user not found', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'user-123' },
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    await handler(req, res)

    expect(res.statusCode).toBe(404)
    expect(res._getJSONData()).toEqual({ error: 'User not found' })
  })

  it('returns pro status with proExpiration', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    const userId = 'user-123'
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 3) // 3 months in the future

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: userId },
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: userId,
      name: 'testuser',
      displayName: 'Test User',
      proExpiration: futureDate,
    } as any)

    vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([])

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const data = res._getJSONData()
    expect(data.isPro).toBe(true)
    expect(data.expirationDate).toEqual(futureDate.toISOString())
    expect(data.hasLifetime).toBe(false)
  })

  it('returns pro status with lifetime subscription', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    const userId = 'user-123'
    const farFutureDate = new Date('2099-12-31')

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: userId },
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: userId,
      name: 'testuser',
      displayName: 'Test User',
      proExpiration: null,
    } as any)

    vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
      {
        id: 'sub-123',
        userId,
        tier: 'PRO',
        status: 'ACTIVE',
        transactionType: 'LIFETIME',
        currentPeriodEnd: farFutureDate,
        isGift: false,
      } as any,
    ])

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const data = res._getJSONData()
    expect(data.isPro).toBe(true)
    expect(data.hasLifetime).toBe(true)
    expect(data.subscriptionSources).toHaveLength(1)
    expect(data.subscriptionSources[0].isLifetime).toBe(true)
  })

  it('returns pro status with gift subscription', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    const userId = 'user-123'
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 3) // 3 months in the future

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: userId },
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: userId,
      name: 'testuser',
      displayName: 'Test User',
      proExpiration: futureDate,
    } as any)

    vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([
      {
        id: 'sub-123',
        userId,
        tier: 'PRO',
        status: 'ACTIVE',
        transactionType: 'RECURRING',
        currentPeriodEnd: futureDate,
        isGift: true,
        giftDetails: {
          senderName: 'Gift Sender',
          giftType: 'monthly',
          giftQuantity: 3,
        },
      } as any,
    ])

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const data = res._getJSONData()
    expect(data.isPro).toBe(true)
    expect(data.expirationDate).toEqual(futureDate.toISOString())
    expect(data.hasLifetime).toBe(false)
    expect(data.subscriptionSources).toHaveLength(1)
    expect(data.subscriptionSources[0].type).toBe('GIFT')
    expect(data.subscriptionSources[0].giftDetails).toEqual({
      senderName: 'Gift Sender',
      giftType: 'monthly',
      giftQuantity: 3,
    })
  })

  it('returns inactive status when no subscription or proExpiration', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    const userId = 'user-123'

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: userId },
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: userId,
      name: 'testuser',
      displayName: 'Test User',
      proExpiration: null,
    } as any)

    vi.mocked(prisma.subscription.findMany).mockResolvedValueOnce([])

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const data = res._getJSONData()
    expect(data.isPro).toBe(false)
    expect(data.hasLifetime).toBe(false)
    expect(data.subscriptionSources).toHaveLength(0)
  })
})
