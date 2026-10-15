// @ts-nocheck

import type { NextApiHandler } from 'next'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '@/lib/api/get-server-session'
import prisma from '@/lib/db'
import handler from '@/pages/api/check-requires-refresh'

vi.mock('@/lib/db', () => ({
  default: {
    account: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/api/get-server-session', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods: string[], handler: NextApiHandler) => handler,
}))

vi.mock('@/lib/api-middlewares/with-authentication', () => ({
  withAuthentication: (handler: NextApiHandler) => handler,
}))

const callHandler = async () => {
  const { req, res } = createMocks({ method: 'GET' })
  await handler(req, res)
  return res
}

describe('check-requires-refresh API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', name: 'arteezy' },
    })
  })

  it('returns true when Twitch revoked the token', async () => {
    vi.mocked(prisma.account.findFirst).mockResolvedValue({ requires_refresh: true })

    const res = await callHandler()

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toBe(true)
    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      select: { requires_refresh: true },
      where: { userId: 'user-1' },
    })
  })

  it('returns false for a healthy token', async () => {
    vi.mocked(prisma.account.findFirst).mockResolvedValue({ requires_refresh: false })

    const res = await callHandler()

    expect(res._getJSONData()).toBe(false)
  })

  it('returns true when the session has no Twitch account row', async () => {
    vi.mocked(prisma.account.findFirst).mockResolvedValue(null)

    const res = await callHandler()

    expect(res._getJSONData()).toBe(true)
  })

  it('does not force a sign-out while impersonating', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', isImpersonating: true },
    })

    const res = await callHandler()

    expect(res.statusCode).toBe(403)
    expect(prisma.account.findFirst).not.toHaveBeenCalled()
  })
})
