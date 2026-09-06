import { Prisma } from '@prisma/client'
import type { NextApiHandler } from 'next'
import type { Session } from 'next-auth'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '@/pages/api/settings/[setting-key]'

// Mock the auth module to prevent environment variable checks
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Mock the prisma client
vi.mock('@/lib/db', () => ({
  default: {
    $transaction: vi.fn(),
    setting: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// Mock the withMethods middleware
vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods: string[], handler: NextApiHandler) => handler,
}))

// Mock the withAuthentication middleware
vi.mock('@/lib/api-middlewares/with-authentication', () => ({
  withAuthentication: (handler: NextApiHandler) => handler,
}))

// Mock the getServerSession function
vi.mock('@/lib/api/get-server-session', () => ({
  getServerSession: vi.fn(),
}))

// Mock the subscription utilities (both settings used below are FREE tier, so hasAccess: true)
vi.mock('@/utils/subscription', () => ({
  canAccessFeature: vi.fn(),
  getSubscription: vi.fn(),
}))

// Import the mocked modules
import { getServerSession } from '@/lib/api/get-server-session'
import prisma from '@/lib/db'
import { whatsNew } from '@/lib/whats-new'
import { canAccessFeature, getSubscription } from '@/utils/subscription'

const USER_ID = 'user-id'

// Derived from the real registry so this stays correct as features are added/removed.
const FOLLOW_MASTER_KEYS = whatsNew
  .filter((entry) => entry.followsNewFeatureMaster && entry.settingKey)
  .map((entry) => entry.settingKey as string)

const mockSession = function mockSession(overrides: Partial<Session['user']> = {}) {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: USER_ID, isImpersonating: false, ...overrides },
  } as Session)
}

const patchRequest = function patchRequest(settingKey: string, value: unknown) {
  return createMocks({
    // The handler manually JSON.parses the body (Next's bodyParser leaves it as a raw string
    // since the frontend fetch call doesn't set a Content-Type header), so the mock must match.
    body: JSON.stringify({ value }) as never,
    method: 'PATCH',
    query: { settingKey },
  })
}

describe('settings/[settingKey] API', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    vi.mocked(canAccessFeature).mockReturnValue({ hasAccess: true, requiredTier: 'FREE' })
    vi.mocked(getSubscription).mockResolvedValue(null)
    vi.mocked(prisma.setting.upsert).mockResolvedValue({} as never)
    vi.mocked(prisma.setting.findMany).mockResolvedValue([])
    vi.mocked(prisma.setting.create).mockResolvedValue({} as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([])
  })

  describe('PATCH', () => {
    it('returns 422 for an invalid setting key', async () => {
      mockSession()
      const { req, res } = patchRequest('not-a-real-key', true)

      await handler(req, res)

      expect(res.statusCode).toBe(422)
      expect(prisma.setting.upsert).not.toHaveBeenCalled()
    })

    it('returns 500 when there is no session user id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as Session)
      const { req, res } = patchRequest('aegis', true)

      await handler(req, res)

      expect(res.statusCode).toBe(500)
      expect(prisma.setting.upsert).not.toHaveBeenCalled()
    })

    it('returns 403 for obsServerPassword while impersonating', async () => {
      mockSession({ isImpersonating: true })
      const { req, res } = patchRequest('obsServerPassword', 'secret')

      await handler(req, res)

      expect(res.statusCode).toBe(403)
      expect(prisma.setting.upsert).not.toHaveBeenCalled()
    })

    it('returns 422 with zod issues when the value fails validation', async () => {
      mockSession()
      const { req, res } = patchRequest('aegis', 'not-a-boolean')

      await handler(req, res)

      expect(res.statusCode).toBe(422)
      expect(prisma.setting.upsert).not.toHaveBeenCalled()
    })

    it('updates user.mmr directly instead of writing a Setting row', async () => {
      mockSession()
      const { req, res } = patchRequest('mmr', 1234)

      await handler(req, res)

      expect(res.statusCode).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        data: { mmr: 1234, updatedAt: expect.any(Date) },
        where: { id: USER_ID },
      })
      expect(prisma.setting.upsert).not.toHaveBeenCalled()
    })

    it('upserts a plain setting and returns 200', async () => {
      mockSession()
      const { req, res } = patchRequest('aegis', true)

      await handler(req, res)

      expect(res.statusCode).toBe(200)
      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        create: { key: 'aegis', updatedAt: expect.any(Date), userId: USER_ID, value: true },
        update: { updatedAt: expect.any(Date), value: true },
        where: { key_userId: { key: 'aegis', userId: USER_ID } },
      })
      // Only autoOptInNewFeatures=false triggers the freeze logic.
      expect(prisma.setting.findMany).not.toHaveBeenCalled()
    })

    it('accepts a WL stats window from 1 to 365 days', async () => {
      mockSession()
      const { req, res } = patchRequest('wlStatsDays', 30)

      await handler(req, res)

      expect(res.statusCode).toBe(200)
      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        create: { key: 'wlStatsDays', updatedAt: expect.any(Date), userId: USER_ID, value: 30 },
        update: { updatedAt: expect.any(Date), value: 30 },
        where: { key_userId: { key: 'wlStatsDays', userId: USER_ID } },
      })
    })

    it('accepts null to keep WL stats scoped to this stream', async () => {
      mockSession()
      const { req, res } = patchRequest('wlStatsDays', null)

      await handler(req, res)

      expect(res.statusCode).toBe(200)
      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        create: {
          key: 'wlStatsDays',
          updatedAt: expect.any(Date),
          userId: USER_ID,
          value: Prisma.JsonNull,
        },
        update: { updatedAt: expect.any(Date), value: Prisma.JsonNull },
        where: { key_userId: { key: 'wlStatsDays', userId: USER_ID } },
      })
    })

    it('rejects a WL stats window longer than 365 days', async () => {
      mockSession()
      const { req, res } = patchRequest('wlStatsDays', 366)

      await handler(req, res)

      expect(res.statusCode).toBe(422)
      expect(prisma.setting.upsert).not.toHaveBeenCalled()
    })

    it('accepts an ISO date for the WL challenge start', async () => {
      mockSession()
      const { req, res } = patchRequest('wlStatsStartDate', '2026-08-21')

      await handler(req, res)

      expect(res.statusCode).toBe(200)
      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        create: {
          key: 'wlStatsStartDate',
          updatedAt: expect.any(Date),
          userId: USER_ID,
          value: '2026-08-21',
        },
        update: { updatedAt: expect.any(Date), value: '2026-08-21' },
        where: { key_userId: { key: 'wlStatsStartDate', userId: USER_ID } },
      })
    })

    it('rejects an invalid WL challenge start date', async () => {
      mockSession()
      const { req, res } = patchRequest('wlStatsStartDate', '2026-02-30')

      await handler(req, res)

      expect(res.statusCode).toBe(422)
      expect(prisma.setting.upsert).not.toHaveBeenCalled()
    })

    describe('freeze-on-disable for autoOptInNewFeatures', () => {
      it('does not touch follow-master features when the master is turned on', async () => {
        mockSession()
        const { req, res } = patchRequest('autoOptInNewFeatures', true)

        await handler(req, res)

        expect(res.statusCode).toBe(200)
        expect(prisma.setting.findMany).not.toHaveBeenCalled()
        expect(prisma.setting.create).not.toHaveBeenCalled()
        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('freezes every follow-master feature to true when none have an explicit value yet', async () => {
        mockSession()
        vi.mocked(prisma.setting.findMany).mockResolvedValue([])
        const { req, res } = patchRequest('autoOptInNewFeatures', false)

        await handler(req, res)

        expect(res.statusCode).toBe(200)
        expect(prisma.setting.findMany).toHaveBeenCalledWith({
          select: { key: true },
          where: { key: { in: FOLLOW_MASTER_KEYS }, userId: USER_ID },
        })
        for (const key of FOLLOW_MASTER_KEYS) {
          expect(prisma.setting.create).toHaveBeenCalledWith({
            data: { key, userId: USER_ID, value: true },
          })
        }
        expect(prisma.setting.create).toHaveBeenCalledTimes(FOLLOW_MASTER_KEYS.length)
        expect(prisma.$transaction).toHaveBeenCalledOnce()
      })

      it('does not overwrite a feature the streamer already set explicitly', async () => {
        mockSession()
        const [alreadySetKey, ...rest] = FOLLOW_MASTER_KEYS
        vi.mocked(prisma.setting.findMany).mockResolvedValue([{ key: alreadySetKey } as never])
        const { req, res } = patchRequest('autoOptInNewFeatures', false)

        await handler(req, res)

        expect(prisma.setting.create).not.toHaveBeenCalledWith({
          data: { key: alreadySetKey, userId: USER_ID, value: true },
        })
        for (const key of rest) {
          expect(prisma.setting.create).toHaveBeenCalledWith({
            data: { key, userId: USER_ID, value: true },
          })
        }
        expect(prisma.setting.create).toHaveBeenCalledTimes(rest.length)
      })

      it('skips the transaction entirely when every feature already has an explicit value', async () => {
        mockSession()
        vi.mocked(prisma.setting.findMany).mockResolvedValue(
          FOLLOW_MASTER_KEYS.map((key) => ({ key }) as never),
        )
        const { req, res } = patchRequest('autoOptInNewFeatures', false)

        await handler(req, res)

        expect(res.statusCode).toBe(200)
        expect(prisma.setting.create).not.toHaveBeenCalled()
        expect(prisma.$transaction).not.toHaveBeenCalled()
      })
    })
  })

  describe('GET', () => {
    it('returns the setting for the current user', async () => {
      mockSession()
      vi.mocked(prisma.setting.findFirst).mockResolvedValue({
        id: 'setting-id',
        key: 'aegis',
        userId: USER_ID,
        value: true,
      } as never)

      const { req, res } = createMocks({ method: 'GET', query: { settingKey: 'aegis' } })

      await handler(req, res)

      expect(res.statusCode).toBe(200)
      expect(res._getJSONData()).toStrictEqual(
        expect.objectContaining({ key: 'aegis', value: true }),
      )
    })

    it('redacts obsServerPassword while impersonating', async () => {
      mockSession({ isImpersonating: true })
      vi.mocked(prisma.setting.findFirst).mockResolvedValue({
        id: 'setting-id',
        key: 'obsServerPassword',
        userId: USER_ID,
        value: 'super-secret',
      } as never)

      const { req, res } = createMocks({
        method: 'GET',
        query: { settingKey: 'obsServerPassword' },
      })

      await handler(req, res)

      expect(res._getJSONData().value).toBe('')
    })
  })
})
