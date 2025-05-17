import handler from '@/pages/api/overlay/gift-alert'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  default: {
    notification: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/api/getServerSession', () => ({
  getServerSession: vi.fn(),
}))

// Mock dependencies
vi.mock('@/lib/api-middlewares/with-authentication', () => ({
  withAuthentication: (fn) => fn,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

import { getServerSession } from '@/lib/api/getServerSession'
// Import the mocked dependencies for direct manipulation
import prisma from '@/lib/db'

describe('overlay/gift-alert API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 400 when not authenticated', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    })

    // Mock getServerSession to return null (unauthenticated)
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({ error: 'User is required' })
  })

  it('returns 400 when userId is not available', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    })

    // Mock getServerSession to return a session without user id
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: '',
        name: '',
        image: '',
        isImpersonating: false,
        twitchId: '',
        role: undefined,
        locale: '',
        scope: '',
      },
      expires: '',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({ error: 'User is required' })
  })

  it('returns hasNotification: false when no unread notifications exist', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    })

    // Mock getServerSession to return a valid session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        twitchId: 'twitch-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        role: 'user',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Mock prisma to return no notification
    vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce(null)

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ hasNotification: false })
  })

  it('returns notification details when unread notification exists', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    })

    // Mock getServerSession to return a valid session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        twitchId: 'twitch-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        role: 'user',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Create a mock date for consistent testing
    const mockDate = new Date('2023-01-01T00:00:00Z')

    // Mock prisma to return a notification
    vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce({
      id: 'notification-123',
      userId: 'user-123',
      type: 'GIFT_SUBSCRIPTION',
      isRead: false,
      createdAt: mockDate,
      giftSubscription: {
        senderName: 'John Doe',
        giftType: 'monthly',
        giftQuantity: 3,
        giftMessage: 'Enjoy your gift!',
      },
    } as any)

    await handler(req, res)
    const responseData = res._getJSONData()

    expect(res.statusCode).toBe(200)
    expect(responseData.hasNotification).toBe(true)
    expect(responseData.notification.id).toBe('notification-123')
    expect(responseData.notification.senderName).toBe('John Doe')
    expect(responseData.notification.giftType).toBe('monthly')
    expect(responseData.notification.giftQuantity).toBe(3)
    expect(responseData.notification.giftMessage).toBe('Enjoy your gift!')
    expect(responseData.notification.createdAt).toBe('2023-01-01T00:00:00.000Z')
  })

  it('returns 404 when marking non-existent notification as read', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        notificationId: 'notification-123',
      },
    })

    // Mock getServerSession to return a valid session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        twitchId: 'twitch-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        role: 'user',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Mock prisma to return no notification
    vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce(null)

    await handler(req, res)

    expect(res.statusCode).toBe(404)
    expect(res._getJSONData()).toEqual({ error: 'Notification not found' })
  })

  it('successfully marks notification as read', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        notificationId: 'notification-123',
      },
    })

    // Mock getServerSession to return a valid session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        twitchId: 'twitch-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        role: 'user',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Mock prisma to return a notification
    vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce({
      id: 'notification-123',
      userId: 'user-123',
      type: '',
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      giftSubscriptionId: null,
    })

    // Mock prisma update to return success
    vi.mocked(prisma.notification.update).mockResolvedValueOnce({
      id: '',
      userId: '',
      type: '',
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      giftSubscriptionId: null,
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ success: true })
  })

  it('handles server errors', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {
        id: 'user-123',
      },
    })

    // Mock getServerSession to return a valid session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        twitchId: 'twitch-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        role: 'user',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Mock prisma to throw an error
    vi.mocked(prisma.notification.findFirst).mockRejectedValueOnce(new Error('Database error'))

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({ error: 'Internal server error' })
  })
})
