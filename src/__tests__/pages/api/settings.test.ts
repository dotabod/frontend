import type { NextApiHandler } from 'next'
import type { Session } from 'next-auth'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { getServerSession } from '@/lib/api/getServerSession'
import prisma from '@/lib/db'
import handler from '@/pages/api/settings'

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  default: {
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

vi.mock('@/lib/api/getServerSession', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/utils/subscription', () => ({
  FEATURE_TIERS: {},
  GRACE_PERIOD_END: new Date('2026-01-01T00:00:00.000Z'),
  getSubscription: vi.fn(),
  isInGracePeriod: vi.fn(() => false),
  isSubscriptionActive: vi.fn(() => false),
  SUBSCRIPTION_TIERS: {
    FREE: 'FREE',
    PRO: 'PRO',
  },
}))

const OWNER_ID = 'owner-id'
const PUBLIC_ID = 'public-id'

function createSettingsResult() {
  return {
    Account: [{ providerAccountId: 'twitch-id' }],
    SteamAccount: [],
    beta_tester: false,
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

function mockSession(user?: Session['user']) {
  vi.mocked(getServerSession).mockResolvedValue(user ? ({ user } as Session) : null)
}

describe('settings API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prisma.user.findFirst).mockResolvedValue(createSettingsResult() as never)
  })

  it('redacts the OBS password from an unauthenticated public overlay response', async () => {
    mockSession()
    const { req, res } = createMocks({ method: 'GET', query: { id: PUBLIC_ID } })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.getHeader('Cache-Control')).toBe('public, s-maxage=30, stale-while-revalidate=120')
    expect(res._getJSONData().settings).toEqual([{ key: 'aegis', value: true }])
  })

  it('redacts the OBS password when an authenticated user requests a public overlay by id', async () => {
    mockSession({ id: OWNER_ID } as Session['user'])
    const { req, res } = createMocks({ method: 'GET', query: { id: PUBLIC_ID } })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PUBLIC_ID } }),
    )
    expect(res._getJSONData().settings).toEqual([{ key: 'aegis', value: true }])
  })

  it('keeps the OBS password private and available to the owning dashboard session', async () => {
    mockSession({ id: OWNER_ID, isImpersonating: false } as Session['user'])
    const { req, res } = createMocks({ method: 'GET' })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.getHeader('Cache-Control')).toBe('private, no-store')
    expect(res._getJSONData().settings).toEqual(createSettingsResult().settings)
  })
})
