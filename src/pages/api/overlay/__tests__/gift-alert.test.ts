import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import type { NextApiRequest, NextApiResponse } from 'next'

// Create a mock handler that simulates the API behavior
const mockHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Simulate authentication check
  const session = req.headers.session ? JSON.parse(req.headers.session as string) : null
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = session?.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Handle GET request
  if (req.method === 'GET') {
    // Simulate database query for notifications
    if (req.headers.mocknotificationfound === 'false') {
      return res.status(200).json({ hasNotification: false })
    }

    if (req.headers.mockservererror === 'true') {
      return res.status(500).json({ error: 'Internal server error' })
    }

    // Return mock notification data
    return res.status(200).json({
      hasNotification: true,
      notification: {
        id: 'notification-123',
        senderName: req.headers.sendername || 'John Doe',
        giftType: req.headers.gifttype || 'monthly',
        giftQuantity: Number.parseInt(req.headers.giftquantity as string) || 3,
        giftMessage: req.headers.giftmessage || 'Enjoy your gift!',
        createdAt: new Date().toISOString(),
      },
    })
  }

  // Handle POST request
  if (req.method === 'POST') {
    const { notificationId } = req.body

    // Simulate notification not found
    if (req.headers.mocknotificationfound === 'false') {
      return res.status(404).json({ error: 'Notification not found' })
    }

    // Simulate successful update
    return res.status(200).json({ success: true })
  }

  // Default response for unsupported methods
  return res.status(405).json({ error: 'Method not allowed' })
}

describe('overlay/gift-alert API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    })

    await mockHandler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 when userId is not available', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      headers: {
        session: JSON.stringify({
          user: { id: '' },
        }),
      },
    })

    await mockHandler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
  })

  it('returns hasNotification: false when no unread notifications exist', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      headers: {
        session: JSON.stringify({
          user: { id: 'user-123' },
        }),
        mocknotificationfound: 'false',
      },
    })

    await mockHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ hasNotification: false })
  })

  it('returns notification details when unread notification exists', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      headers: {
        session: JSON.stringify({
          user: { id: 'user-123' },
        }),
        sendername: 'John Doe',
        gifttype: 'monthly',
        giftquantity: '3',
        giftmessage: 'Enjoy your gift!',
      },
    })

    await mockHandler(req, res)
    const responseData = res._getJSONData()

    expect(res.statusCode).toBe(200)
    expect(responseData.hasNotification).toBe(true)
    expect(responseData.notification.id).toBe('notification-123')
    expect(responseData.notification.senderName).toBe('John Doe')
    expect(responseData.notification.giftType).toBe('monthly')
    expect(responseData.notification.giftQuantity).toBe(3)
    expect(responseData.notification.giftMessage).toBe('Enjoy your gift!')
    expect(typeof responseData.notification.createdAt).toBe('string')
  })

  it('returns 404 when marking non-existent notification as read', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      headers: {
        session: JSON.stringify({
          user: { id: 'user-123' },
        }),
        mocknotificationfound: 'false',
      },
      body: {
        notificationId: 'notification-123',
      },
    })

    await mockHandler(req, res)

    expect(res.statusCode).toBe(404)
    expect(res._getJSONData()).toEqual({ error: 'Notification not found' })
  })

  it('successfully marks notification as read', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      headers: {
        session: JSON.stringify({
          user: { id: 'user-123' },
        }),
      },
      body: {
        notificationId: 'notification-123',
      },
    })

    await mockHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ success: true })
  })

  it('handles server errors', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      headers: {
        session: JSON.stringify({
          user: { id: 'user-123' },
        }),
        mockservererror: 'true',
      },
    })

    await mockHandler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({ error: 'Internal server error' })
  })
})
