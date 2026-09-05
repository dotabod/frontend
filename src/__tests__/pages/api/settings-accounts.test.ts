import type { NextApiHandler } from 'next'
import type { Session } from 'next-auth'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServerSession } from '@/lib/api/getServerSession'
import prisma from '@/lib/db'
import handler from '@/pages/api/settings/accounts'

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  default: {
    steamAccount: {
      delete: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
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

vi.mock('@/lib/api/getServerSession', () => ({
  getServerSession: vi.fn(),
}))

const USER_ID = 'session-user'
const VICTIM_ID = 'victim-user'

function mockSession(userId?: string) {
  vi.mocked(getServerSession).mockResolvedValue(
    userId ? ({ user: { id: userId } } as Session) : null,
  )
}

function patchRequest(updates: unknown, query: Record<string, string> = {}) {
  return createMocks({
    body: JSON.stringify(updates) as never,
    method: 'PATCH',
    query,
  })
}

describe('settings/accounts API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)
  })

  it('returns 401 instead of accepting query-string identity without a session', async () => {
    mockSession()
    const { req, res } = createMocks({ method: 'GET', query: { id: VICTIM_ID } })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(prisma.steamAccount.findMany).not.toHaveBeenCalled()
  })

  it('ignores an id query parameter when an authenticated session is present', async () => {
    mockSession(USER_ID)
    vi.mocked(prisma.steamAccount.findMany).mockResolvedValue([])
    const { req, res } = createMocks({ method: 'GET', query: { id: VICTIM_ID } })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(prisma.steamAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ userId: USER_ID }, { connectedUserIds: { has: USER_ID } }],
        },
      }),
    )
  })

  it('uses the session owner for PATCH authorization even when id targets another user', async () => {
    mockSession(USER_ID)
    vi.mocked(prisma.steamAccount.findMany).mockResolvedValue([])
    const { req, res } = patchRequest([{ mmr: 7000, steam32Id: 222 }], { id: VICTIM_ID })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(prisma.steamAccount.findMany).toHaveBeenCalledWith({
      select: { steam32Id: true },
      where: {
        steam32Id: { in: [222] },
        userId: USER_ID,
      },
    })
    expect(prisma.steamAccount.update).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('marks owned accounts editable and linked accounts read-only', async () => {
    mockSession(USER_ID)
    vi.mocked(prisma.steamAccount.findMany).mockResolvedValue([
      {
        connectedUserIds: ['another-user'],
        leaderboard_rank: 10,
        mmr: 5000,
        name: 'Owned account',
        steam32Id: 111,
        user: { id: USER_ID, name: 'session-user-name' },
      },
      {
        connectedUserIds: [USER_ID],
        leaderboard_rank: null,
        mmr: 4000,
        name: 'Shared account',
        steam32Id: 222,
        user: { id: VICTIM_ID, name: 'victim-name' },
      },
    ] as never)
    const { req, res } = createMocks({ method: 'GET' })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData().accounts).toEqual([
      {
        canEdit: true,
        leaderboard_rank: 10,
        mmr: 5000,
        name: 'Owned account',
        steam32Id: 111,
      },
      {
        canEdit: false,
        connectedUserIds: ['victim-name'],
        leaderboard_rank: null,
        mmr: 4000,
        name: 'Shared account',
        steam32Id: 222,
      },
    ])
  })

  it('updates and hard-deletes accounts owned by the session user', async () => {
    mockSession(USER_ID)
    vi.mocked(prisma.steamAccount.findMany).mockResolvedValue([
      { steam32Id: 111 },
      { steam32Id: 222 },
    ] as never)
    vi.mocked(prisma.steamAccount.update).mockResolvedValue({
      mmr: 6000,
      name: 'Owned account',
      steam32Id: 111,
    } as never)
    vi.mocked(prisma.steamAccount.delete).mockResolvedValue({ steam32Id: 222 } as never)
    const { req, res } = patchRequest([
      { mmr: 6000, name: 'Owned account', steam32Id: 111 },
      { delete: true, mmr: 4000, name: 'Second account', steam32Id: 222 },
    ])

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(prisma.steamAccount.findMany).toHaveBeenCalledWith({
      select: { steam32Id: true },
      where: {
        steam32Id: { in: [111, 222] },
        userId: USER_ID,
      },
    })
    expect(prisma.steamAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { steam32Id: 111 } }),
    )
    expect(prisma.steamAccount.delete).toHaveBeenCalledWith({ where: { steam32Id: 222 } })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('rejects a mixed owned and non-owned PATCH before making any writes', async () => {
    mockSession(USER_ID)
    vi.mocked(prisma.steamAccount.findMany).mockResolvedValue([{ steam32Id: 111 }] as never)
    const { req, res } = patchRequest([
      { mmr: 6000, steam32Id: 111 },
      { mmr: 7000, steam32Id: 222 },
    ])

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(prisma.steamAccount.update).not.toHaveBeenCalled()
    expect(prisma.steamAccount.delete).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it.each(['linked-only', 'unrelated'])('rejects a %s account update', async () => {
    mockSession(USER_ID)
    vi.mocked(prisma.steamAccount.findMany).mockResolvedValue([])
    const { req, res } = patchRequest([{ mmr: 7000, steam32Id: 222 }])

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(prisma.steamAccount.update).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
