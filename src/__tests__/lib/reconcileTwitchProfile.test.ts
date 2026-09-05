import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

function mockHelix(data: { id: string; login: string; display_name: string }[] | null) {
  globalThis.fetch = vi.fn(async () => ({
    json: async () => ({ data: data ?? [] }),
    ok: true,
    status: 200,
  })) as unknown as typeof fetch
}

function makePrisma() {
  const calls: { where: unknown; data: unknown }[] = []
  return {
    calls,
    user: {
      update: async (args: { where: unknown; data: unknown }) => {
        calls.push(args)
        return {}
      },
    },
  }
}

describe(reconcileTwitchProfile, () => {
  it('updates name and displayName when the login changed (login-only rename)', async () => {
    // Edge case: user changed Twitch login from `techleed → jamesleed` but
    // kept the same display name. The jwt() rename-detection check compares
    // preferred_username (= display name), which is unchanged, so it misses
    // the rename. This reconciler is the safety net.
    mockHelix([{ display_name: 'TECHLEED', id: '32474777', login: 'jamesleed' }])
    const prisma = makePrisma()

    const result = await reconcileTwitchProfile({
      accessToken: 'tok',
      currentDisplayName: 'TECHLEED',
      currentName: 'techleed',
      prisma: prisma as never,
      userId: 'u-1',
    })

    expect(result).toBe('updated')
    expect(prisma.calls).toHaveLength(1)
    expect(prisma.calls[0].data).toMatchObject({
      displayName: 'TECHLEED',
      name: 'jamesleed',
    })
  })

  it('updates when displayName changed (the typical rename)', async () => {
    mockHelix([{ display_name: 'JAMESLEED', id: '32474777', login: 'jamesleed' }])
    const prisma = makePrisma()

    await reconcileTwitchProfile({
      accessToken: 'tok',
      currentDisplayName: 'TECHLEED',
      currentName: 'techleed',
      prisma: prisma as never,
      userId: 'u-1',
    })

    expect(prisma.calls[0].data).toMatchObject({
      displayName: 'JAMESLEED',
      name: 'jamesleed',
    })
  })

  it('skips the prisma.update when nothing changed (idempotent)', async () => {
    mockHelix([{ display_name: 'TECHLEED', id: '32474777', login: 'techleed' }])
    const prisma = makePrisma()

    const result = await reconcileTwitchProfile({
      accessToken: 'tok',
      currentDisplayName: 'TECHLEED',
      currentName: 'techleed',
      prisma: prisma as never,
      userId: 'u-1',
    })

    expect(result).toBe('no-change')
    expect(prisma.calls).toHaveLength(0)
  })

  it('backfills a NULL displayName from Helix on next sign-in (legacy row recovery)', async () => {
    // Legacy users created before the TwitchProvider.profile() override may
    // have displayName=NULL. Their next sign-in should populate it.
    mockHelix([{ display_name: 'TECHLEED', id: '32474777', login: 'techleed' }])
    const prisma = makePrisma()

    const result = await reconcileTwitchProfile({
      accessToken: 'tok',
      currentDisplayName: null,
      currentName: 'techleed',
      prisma: prisma as never,
      userId: 'u-1',
    })

    expect(result).toBe('updated')
    expect(prisma.calls[0].data).toMatchObject({
      displayName: 'TECHLEED',
      name: 'techleed',
    })
  })

  it('returns "helix-unavailable" without throwing when /helix/users fails (network blip)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })
    const prisma = makePrisma()

    const result = await reconcileTwitchProfile({
      accessToken: 'tok',
      currentDisplayName: 'TECHLEED',
      currentName: 'techleed',
      prisma: prisma as never,
      userId: 'u-1',
    })

    expect(result).toBe('helix-unavailable')
    expect(prisma.calls).toHaveLength(0)
  })

  it('returns "helix-unavailable" when /helix/users returns empty data', async () => {
    mockHelix([])
    const prisma = makePrisma()

    const result = await reconcileTwitchProfile({
      accessToken: 'tok',
      currentDisplayName: 'TECHLEED',
      currentName: 'techleed',
      prisma: prisma as never,
      userId: 'u-1',
    })

    expect(result).toBe('helix-unavailable')
    expect(prisma.calls).toHaveLength(0)
  })
})
