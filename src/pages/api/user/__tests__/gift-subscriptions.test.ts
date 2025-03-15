import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import handler from '../gift-subscriptions'

// Mock prisma
vi.mock('@/lib/db', () => ({
  default: {
    subscription: {
      findMany: vi.fn(),
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
  formatDate: vi.fn((date) => '2025-01-01'),
}))

// Import mocked modules
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { formatDate } from '@/utils/formatDate'

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

    await handler(req, res)

    expect(getServerSession).toHaveBeenCalled()
    expect(prisma.subscription.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        isGift: true,
        status: 'ACTIVE',
      },
      orderBy: {
        currentPeriodEnd: 'desc',
      },
      include: {
        giftDetails: true,
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      hasGifts: false,
      giftCount: 0,
      giftMessage: '',
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
        currentPeriodEnd: endDate,
        giftDetails: {
          senderName: 'John Doe',
        },
      },
    ])

    // Mock formatDate
    vi.mocked(formatDate).mockReturnValueOnce('January 1, 2025')

    await handler(req, res)

    expect(formatDate).toHaveBeenCalledWith(endDate)
    expect(res.statusCode).toBe(200)

    const responseData = res._getJSONData()
    expect(responseData.hasGifts).toBe(true)
    expect(responseData.giftCount).toBe(1)
    expect(responseData.giftMessage).toBe(
      'You have received a gift subscription that extends your access until January 1, 2025. This gift will not auto-renew.',
    )
    expect(responseData.giftSubscriptions[0].id).toBe('sub-123')
    expect(responseData.giftSubscriptions[0].senderName).toBe('John Doe')
    // Don't test the exact date format, just ensure it exists
    expect(responseData.giftSubscriptions[0].endDate).toBeDefined()
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
        currentPeriodEnd: endDate1,
        giftDetails: {
          senderName: 'John Doe',
        },
      },
      {
        id: 'sub-456',
        currentPeriodEnd: endDate2,
        giftDetails: {
          senderName: 'Jane Smith',
        },
      },
    ])

    // Mock formatDate
    vi.mocked(formatDate).mockReturnValueOnce('January 1, 2025')

    await handler(req, res)

    expect(formatDate).toHaveBeenCalledWith(endDate1)
    expect(res.statusCode).toBe(200)

    const responseData = res._getJSONData()
    expect(responseData.hasGifts).toBe(true)
    expect(responseData.giftCount).toBe(2)
    expect(responseData.giftMessage).toBe(
      'You have received 2 gift subscriptions that extend your access until January 1, 2025. These gifts will not auto-renew.',
    )
    expect(responseData.giftSubscriptions).toHaveLength(2)
    expect(responseData.giftSubscriptions[0].id).toBe('sub-123')
    expect(responseData.giftSubscriptions[0].senderName).toBe('John Doe')
    expect(responseData.giftSubscriptions[1].id).toBe('sub-456')
    expect(responseData.giftSubscriptions[1].senderName).toBe('Jane Smith')
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
        currentPeriodEnd: endDate,
        giftDetails: null,
      },
    ])

    // Mock formatDate
    vi.mocked(formatDate).mockReturnValueOnce('January 1, 2025')

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData().giftSubscriptions[0].senderName).toBe('Anonymous')
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
