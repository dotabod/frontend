import { Prisma } from '@prisma/client'
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import prisma from '@/lib/db'
import handler from '@/pages/api/diagnostics/overlay-page'

vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods: string[], handler: NextApiHandler) => handler,
}))
vi.mock('@/lib/db', () => ({ default: { setting: { upsert: vi.fn() } } }))

describe('overlay page diagnostic beacon', () => {
  beforeEach(() => vi.resetAllMocks())

  it('records that the requested overlay page executed', async () => {
    vi.mocked(prisma.setting.upsert).mockResolvedValue({} as never)
    const { req, res } = createMocks({
      body: { userId: '00000000-0000-4000-8000-000000000000' },
      method: 'POST',
    })
    await handler(req, res)

    expect(res.statusCode).toBe(204)
    expect(prisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          key_userId: {
            key: 'overlay_page_last_seen_at',
            userId: '00000000-0000-4000-8000-000000000000',
          },
        },
      }),
    )
  })

  it('rejects malformed user IDs without writing', async () => {
    const { req, res } = createMocks({ body: { userId: 'bad' }, method: 'POST' })
    await handler(req, res)
    expect(res.statusCode).toBe(422)
    expect(prisma.setting.upsert).not.toHaveBeenCalled()
  })

  it('returns not found when the overlay user no longer exists', async () => {
    vi.mocked(prisma.setting).upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
        clientVersion: 'test',
        code: 'P2003',
      }),
    )
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      body: { userId: '00000000-0000-4000-8000-000000000000' },
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('rethrows unrelated database failures', async () => {
    const outage = new Prisma.PrismaClientUnknownRequestError('Database unavailable', {
      clientVersion: 'test',
    })
    vi.mocked(prisma.setting).upsert.mockRejectedValue(outage)
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      body: { userId: '00000000-0000-4000-8000-000000000000' },
      method: 'POST',
    })

    await expect(handler(req, res)).rejects.toBe(outage)
  })
})
