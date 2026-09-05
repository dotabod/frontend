import type { NextApiHandler } from 'next'
import type { Session } from 'next-auth'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServerSession } from '@/lib/api/getServerSession'
import prisma from '@/lib/db'
import handler from '@/pages/api/diagnostics/status'

vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods: string[], handler: NextApiHandler) => handler,
}))
vi.mock('@/lib/api/getServerSession', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { setting: { findMany: vi.fn() } } }))

describe('diagnostics status API', () => {
  beforeEach(() => vi.resetAllMocks())

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req, res)
    expect(res.statusCode).toBe(403)
  })

  it('returns only diagnostic timestamps owned by the session user', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'owner' } } as Session)
    vi.mocked(prisma.setting.findMany).mockResolvedValue([
      { key: 'gsi_last_seen_at', updatedAt: new Date('2026-09-04T12:00:00Z') },
    ] as never)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req, res)

    expect(prisma.setting.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'owner' }) }),
    )
    expect(res._getJSONData()).toEqual({
      gsiLastSeenAt: '2026-09-04T12:00:00.000Z',
      overlayPageLastSeenAt: null,
      overlaySocketLastSeenAt: null,
    })
  })
})
