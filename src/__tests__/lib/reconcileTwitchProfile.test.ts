import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { reconcileTwitchProfile } from '@/lib/reconcileTwitchProfile'

const originalFetch = globalThis.fetch
const originalClientId = process.env.TWITCH_CLIENT_ID

beforeEach(() => {
  process.env.TWITCH_CLIENT_ID = 'test-client-id'
})

afterEach(() => {
  globalThis.fetch = originalFetch
  process.env.TWITCH_CLIENT_ID = originalClientId
})

function mockHelix(data: Array<{ id: string; login: string; display_name: string }> | null) {
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: data ?? [] }),
  })) as unknown as typeof fetch
}

function makePrisma(initial: { name: string; displayName: string | null }) {
  const calls: Array<{ where: unknown; data: unknown }> = []
  return {
    calls,
    user: {
      findUnique: async () => initial,
      update: async (args: { where: unknown; data: unknown }) => {
        calls.push(args)
        return initial
      },
    },
  }
}

describe('reconcileTwitchProfile', () => {
  it('updates name and displayName when the login changed (login-only rename)', async () => {
    // Edge case: user changed Twitch login from `techleed → jamesleed` but
    // kept the same display name. The jwt() rename-detection check compares
    // preferred_username (= display name), which is unchanged, so it misses
    // the rename. This reconciler is the safety net.
    mockHelix([{ id: '32474777', login: 'jamesleed', display_name: 'TECHLEED' }])
    const prisma = makePrisma({ name: 'techleed', displayName: 'TECHLEED' })

    const result = await reconcileTwitchProfile({
      prisma: prisma as never,
      userId: 'u-1',
      accessToken: 'tok',
    })

    expect(result).toBe('updated')
    expect(prisma.calls).toHaveLength(1)
    expect(prisma.calls[0].data).toMatchObject({
      name: 'jamesleed',
      displayName: 'TECHLEED',
    })
  })

  it('updates when displayName changed (the typical rename)', async () => {
    mockHelix([{ id: '32474777', login: 'jamesleed', display_name: 'JAMESLEED' }])
    const prisma = makePrisma({ name: 'techleed', displayName: 'TECHLEED' })

    await reconcileTwitchProfile({ prisma: prisma as never, userId: 'u-1', accessToken: 'tok' })

    expect(prisma.calls[0].data).toMatchObject({
      name: 'jamesleed',
      displayName: 'JAMESLEED',
    })
  })

  it('skips the prisma.update when nothing changed (idempotent)', async () => {
    mockHelix([{ id: '32474777', login: 'techleed', display_name: 'TECHLEED' }])
    const prisma = makePrisma({ name: 'techleed', displayName: 'TECHLEED' })

    const result = await reconcileTwitchProfile({
      prisma: prisma as never,
      userId: 'u-1',
      accessToken: 'tok',
    })

    expect(result).toBe('no-change')
    expect(prisma.calls).toHaveLength(0)
  })

  it('backfills a NULL displayName from Helix on next sign-in (legacy row recovery)', async () => {
    // Legacy users created before the TwitchProvider.profile() override may
    // have displayName=NULL. Their next sign-in should populate it.
    mockHelix([{ id: '32474777', login: 'techleed', display_name: 'TECHLEED' }])
    const prisma = makePrisma({ name: 'techleed', displayName: null })

    const result = await reconcileTwitchProfile({
      prisma: prisma as never,
      userId: 'u-1',
      accessToken: 'tok',
    })

    expect(result).toBe('updated')
    expect(prisma.calls[0].data).toMatchObject({
      name: 'techleed',
      displayName: 'TECHLEED',
    })
  })

  it('returns "helix-unavailable" without throwing when /helix/users fails (network blip)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNRESET')
    }) as unknown as typeof fetch
    const prisma = makePrisma({ name: 'techleed', displayName: 'TECHLEED' })

    const result = await reconcileTwitchProfile({
      prisma: prisma as never,
      userId: 'u-1',
      accessToken: 'tok',
    })

    expect(result).toBe('helix-unavailable')
    expect(prisma.calls).toHaveLength(0)
  })

  it('returns "helix-unavailable" when /helix/users returns empty data', async () => {
    mockHelix([])
    const prisma = makePrisma({ name: 'techleed', displayName: 'TECHLEED' })

    const result = await reconcileTwitchProfile({
      prisma: prisma as never,
      userId: 'u-1',
      accessToken: 'tok',
    })

    expect(result).toBe('helix-unavailable')
    expect(prisma.calls).toHaveLength(0)
  })
})
