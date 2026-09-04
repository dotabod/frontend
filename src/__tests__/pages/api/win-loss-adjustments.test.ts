import type { NextApiHandler } from 'next'
import type { Session } from 'next-auth'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { getServerSession } from '@/lib/api/getServerSession'
import prisma from '@/lib/db'
import handler from '@/pages/api/win-loss-adjustments'

vi.mock('@/lib/auth', () => ({ authOptions: {} }))

vi.mock('@/lib/db', () => ({
  default: {
    winLossAdjustment: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods: string[], route: NextApiHandler) => route,
}))

vi.mock('@/lib/api/getServerSession', () => ({ getServerSession: vi.fn() }))

const USER_ID = 'user-1'

function postRequest(body: unknown) {
  return createMocks({ body: body as never, method: 'POST' })
}

describe('win-loss adjustments API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: USER_ID } } as Session)
    vi.mocked(prisma.winLossAdjustment.create).mockResolvedValue({
      createdAt: new Date('2026-09-04T12:00:00.000Z'),
    } as never)
  })

  it('stores one authenticated ranked win correction', async () => {
    const { req, res } = postRequest({ delta: 1, lobbyType: 7, won: true })

    await handler(req, res)

    expect(res.statusCode).toBe(201)
    expect(prisma.winLossAdjustment.create).toHaveBeenCalledWith({
      data: { delta: 1, lobbyType: 7, userId: USER_ID, won: true },
      select: { createdAt: true },
    })
  })

  it('stores a multi-game subtraction as one correction', async () => {
    const { req, res } = postRequest({ delta: -3, lobbyType: 0, won: false })

    await handler(req, res)

    expect(res.statusCode).toBe(201)
    expect(prisma.winLossAdjustment.create).toHaveBeenCalledWith({
      data: { delta: -3, lobbyType: 0, userId: USER_ID, won: false },
      select: { createdAt: true },
    })
  })

  it('rejects a correction from an unauthenticated request', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const { req, res } = postRequest({ delta: 1, lobbyType: 7, won: true })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(prisma.winLossAdjustment.create).not.toHaveBeenCalled()
  })

  it('rejects a zero correction', async () => {
    const { req, res } = postRequest({ delta: 0, lobbyType: 7, won: true })

    await handler(req, res)

    expect(res.statusCode).toBe(422)
    expect(prisma.winLossAdjustment.create).not.toHaveBeenCalled()
  })

  it('rejects a correction larger than the dashboard limit', async () => {
    const { req, res } = postRequest({ delta: -1001, lobbyType: 7, won: true })

    await handler(req, res)

    expect(res.statusCode).toBe(422)
    expect(prisma.winLossAdjustment.create).not.toHaveBeenCalled()
  })

  it('rejects an unsupported lobby type', async () => {
    const { req, res } = postRequest({ delta: 1, lobbyType: 3, won: true })

    await handler(req, res)

    expect(res.statusCode).toBe(422)
    expect(prisma.winLossAdjustment.create).not.toHaveBeenCalled()
  })
})
