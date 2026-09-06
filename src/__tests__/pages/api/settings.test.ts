import { Prisma } from '@prisma/client'
import type { NextApiHandler } from 'next'
import type { Session } from 'next-auth'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '@/lib/api/get-server-session'
import prisma from '@/lib/db'
import handler from '@/pages/api/settings'

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  default: {
    setting: {
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods: string[], handler: NextApiHandler) => handler,
}))

vi.mock('@/lib/api/get-server-session', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/utils/subscription', () => ({
  FEATURE_TIERS: {},
  GRACE_PERIOD_END: new Date('2026-01-01T00:00:00.000Z'),
  SUBSCRIPTION_TIERS: {
    FREE: 'FREE',
    PRO: 'PRO',
  },
  canAccessFeature: vi.fn(() => ({ hasAccess: true, requiredTier: 'FREE' })),
  getSubscription: vi.fn(),
  isInGracePeriod: vi.fn(() => false),
  isSubscriptionActive: vi.fn(() => false),
}))

const OWNER_ID = 'owner-id'
const PUBLIC_ID = 'public-id'

const createSettingsResult = function createSettingsResult() {
  return {
    Account: [{ providerAccountId: 'twitch-id' }],
    SteamAccount: [],
    beta_tester: false,
    locale: 'ru-RU',
    mmr: 1234,
    settings: [
      { key: 'obsServerPassword', value: 'super-secret' },
      { key: 'aegis', value: true },
    ],
    steam32Id: null,
    stream_online: true,
    subscription: [],
  }
}

const mockSession = function mockSession(user?: Session['user']) {
  vi.mocked(getServerSession).mockResolvedValue(user ? ({ user } as Session) : null)
}

describe('settings API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prisma.user.findFirst).mockResolvedValue(createSettingsResult() as never)
    vi.mocked(prisma.setting.create).mockResolvedValue({ id: 'setting-id' } as never)
  })

  it('redacts the OBS password from an unauthenticated public overlay response', async () => {
    mockSession()
    const { req, res } = createMocks({ method: 'GET', query: { id: PUBLIC_ID } })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.getHeader('Cache-Control')).toBe('private, no-store')
    expect(res._getJSONData().locale).toBe('ru-RU')
    expect(res._getJSONData().settings).toStrictEqual([{ key: 'aegis', value: true }])
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ locale: true }),
      }),
    )
  })

  it('returns the public Twitch channel id used by the live profile counter', async () => {
    mockSession()
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      Account: { providerAccountId: 'twitch-id' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      displayName: 'Streamer',
      image: null,
      name: 'streamer',
      settings: [],
      stream_online: false,
      subscription: [],
    } as never)
    const { req, res } = createMocks({ method: 'GET', query: { username: 'streamer' } })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toMatchObject({ twitchId: 'twitch-id' })
    expect(res._getJSONData()).not.toHaveProperty('Account')
  })

  it('redacts the OBS password when an authenticated user requests a public overlay by id', async () => {
    mockSession({ id: OWNER_ID } as Session['user'])
    const { req, res } = createMocks({ method: 'GET', query: { id: PUBLIC_ID } })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PUBLIC_ID } }),
    )
    expect(res._getJSONData().settings).toStrictEqual([{ key: 'aegis', value: true }])
  })

  it('keeps the OBS password private and available to the owning dashboard session', async () => {
    mockSession({ id: OWNER_ID, isImpersonating: false } as Session['user'])
    const { req, res } = createMocks({ method: 'GET' })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.getHeader('Cache-Control')).toBe('private, no-store')
    expect(res._getJSONData().settings).toStrictEqual(createSettingsResult().settings)
  })

  it('stores the per-stream WL mode as JSON null', async () => {
    mockSession({ id: OWNER_ID, isImpersonating: false } as Session['user'])
    const { req, res } = createMocks({
      body: JSON.stringify({ key: 'wlStatsDays', value: null }) as never,
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(prisma.setting.create).toHaveBeenCalledWith({
      data: { key: 'wlStatsDays', userId: OWNER_ID, value: Prisma.JsonNull },
      select: { id: true },
    })
  })
})
