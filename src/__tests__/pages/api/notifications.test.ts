import type { NextApiHandler } from 'next'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({
  default: {
    notification: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    subscription: { findMany: vi.fn() },
  },
}))
vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods: string[], handler: NextApiHandler) => handler,
}))
vi.mock('@/lib/api/getServerSession', () => ({ getServerSession: vi.fn() }))

import { getServerSession } from '@/lib/api/getServerSession'
import prisma from '@/lib/db'
import handler from '@/pages/api/notifications'

const auth = (userId: string | null) =>
  vi.mocked(getServerSession).mockResolvedValue(userId ? ({ user: { id: userId } } as any) : null)

describe('notifications API', () => {
  beforeEach(() => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.notification.findMany).mockResolvedValue([] as any)
  })

  it('GET 401 when unauthenticated', async () => {
    auth(null)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req, res)
    expect(res.statusCode).toBe(401)
  })

  it('GET maps gift + new_feature rows and drops orphaned gifts', async () => {
    auth('u1')
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      {
        id: 'g1',
        type: 'GIFT_SUBSCRIPTION',
        isRead: false,
        createdAt: new Date(),
        userId: 'u1',
        giftSubscription: {
          giftType: 'monthly',
          giftQuantity: 2,
          giftMessage: 'hi',
          senderName: 'Bob',
        },
      },
      {
        id: 'f1',
        type: 'NEW_FEATURE',
        isRead: false,
        createdAt: new Date(),
        userId: 'u1',
        giftSubscription: null,
      },
      // orphaned gift (its giftSubscription row was deleted) → dropped
      {
        id: 'g2',
        type: 'GIFT_SUBSCRIPTION',
        isRead: false,
        createdAt: new Date(),
        userId: 'u1',
        giftSubscription: null,
      },
    ] as any)

    const { req, res } = createMocks({ method: 'GET', query: { includeRead: 'true' } })
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const json = res._getJSONData()
    expect(json.totalNotifications).toBe(2)
    const byId = Object.fromEntries(json.notifications.map((n: any) => [n.id, n]))
    expect(byId.g1).toMatchObject({
      type: 'GIFT_SUBSCRIPTION',
      senderName: 'Bob',
      giftType: 'monthly',
      giftQuantity: 2,
    })
    expect(byId.f1).toMatchObject({ type: 'NEW_FEATURE' })
    expect(byId.f1.senderName).toBeUndefined()
    expect(byId.g2).toBeUndefined()
    expect(json.hasLifetime).toBe(false)
  })

  it('GET reports hasLifetime from active subscriptions', async () => {
    auth('u1')
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      { giftDetails: { giftType: 'lifetime' }, tier: 'PRO', transactionType: 'LIFETIME' },
    ] as any)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req, res)
    expect(res._getJSONData().hasLifetime).toBe(true)
  })

  it('GET defaults to unread-only unless includeRead=true', async () => {
    auth('u1')
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req, res)
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isRead: false, userId: 'u1' }) }),
    )
  })

  it('POST marks a notification read', async () => {
    auth('u1')
    vi.mocked(prisma.notification.findFirst).mockResolvedValue({ id: 'n1', userId: 'u1' } as any)
    vi.mocked(prisma.notification.update).mockResolvedValue({ id: 'n1' } as any)
    const { req, res } = createMocks({ method: 'POST', body: { notificationId: 'n1' } })
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isRead: true, updatedAt: expect.any(Date) },
        where: { id: 'n1' },
      }),
    )
  })

  it("POST 404 when the notification isn't the caller's", async () => {
    auth('u1')
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(null as any)
    const { req, res } = createMocks({ method: 'POST', body: { notificationId: 'n1' } })
    await handler(req, res)
    expect(res.statusCode).toBe(404)
    expect(prisma.notification.update).not.toHaveBeenCalled()
  })

  it('POST 400 on an invalid body', async () => {
    auth('u1')
    const { req, res } = createMocks({ method: 'POST', body: {} })
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  it('405 on an unsupported method', async () => {
    auth('u1')
    const { req, res } = createMocks({ method: 'PUT' })
    await handler(req, res)
    expect(res.statusCode).toBe(405)
  })
})
