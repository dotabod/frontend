import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('node-fetch', () => ({ default: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

// Fresh module graph per test so the memoized property-creation promise resets.
async function load() {
  const fetchMod = await import('node-fetch')
  const sentry = await import('@sentry/nextjs')
  const mod = await import('@/lib/hubspot')
  return {
    captureException: vi.mocked(sentry.captureException),
    fetchMock: vi.mocked(fetchMod.default),
    ...mod,
  }
}

const res = (body: unknown = {}, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async () => body,
  }) as any

const isUrl = (call: unknown[], suffix: string) => String(call[0]).endsWith(suffix)
const bodyOf = (call: unknown[]) => JSON.parse((call[1] as any).body)

describe('lib/hubspot', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('subscriptionToValue', () => {
    it('maps tiers and statuses to the enum option values', async () => {
      const { subscriptionToValue } = await load()
      expect(subscriptionToValue(null)).toBe('free')
      expect(subscriptionToValue({ tier: 'FREE' })).toBe('free')
      expect(subscriptionToValue({})).toBe('free')
      expect(
        subscriptionToValue({ status: 'ACTIVE', tier: 'PRO', transactionType: 'LIFETIME' }),
      ).toBe('pro_lifetime')
      expect(subscriptionToValue({ status: 'TRIALING', tier: 'PRO' })).toBe('pro_trial')
      expect(subscriptionToValue({ status: 'PAST_DUE', tier: 'PRO' })).toBe('pro_past_due')
      expect(subscriptionToValue({ status: 'ACTIVE', tier: 'PRO' })).toBe('pro')
    })
  })

  describe('syncHubSpotContact', () => {
    const PATCH_SUFFIX = `/objects/contacts/${encodeURIComponent('a@b.com')}?idProperty=email`
    const isPatch = (call: unknown[]) => isUrl(call, PATCH_SUFFIX)

    it('creates both properties and patches the contact by email with the subscription', async () => {
      const { fetchMock, syncHubSpotContact } = await load()
      fetchMock.mockResolvedValue(res())

      await syncHubSpotContact('tok', { email: 'a@b.com', subscription: 'pro', username: 'gamer' })

      const propertyCalls = fetchMock.mock.calls.filter((c) => isUrl(c, '/properties/contacts'))
      expect(propertyCalls).toHaveLength(2)

      const patch = fetchMock.mock.calls.find(isPatch)
      expect(patch).toBeDefined()
      expect((patch as unknown[])[1]).toMatchObject({ method: 'PATCH' })
      expect(bodyOf(patch as unknown[])).toEqual({
        properties: { dotabod_subscription: 'pro', twitch_username: 'gamer' },
      })
    })

    it('omits dotabod_subscription when no subscription value is provided', async () => {
      const { fetchMock, syncHubSpotContact } = await load()
      fetchMock.mockResolvedValue(res())

      await syncHubSpotContact('tok', { email: 'a@b.com', username: 'gamer' })

      const patch = fetchMock.mock.calls.find(isPatch)
      expect(bodyOf(patch as unknown[]).properties).toEqual({
        twitch_username: 'gamer',
      })
    })

    it('treats a 409 on property creation as success and still patches', async () => {
      const { fetchMock, syncHubSpotContact } = await load()
      fetchMock.mockImplementation(async (url: unknown) =>
        String(url).endsWith('/properties/contacts') ? res({}, 409) : res(),
      )

      await syncHubSpotContact('tok', { email: 'a@b.com', subscription: 'pro', username: 'g' })

      expect(fetchMock.mock.calls.some(isPatch)).toBe(true)
    })

    it('falls back to creating the contact when PATCH returns 404', async () => {
      const { fetchMock, syncHubSpotContact } = await load()
      fetchMock.mockImplementation(async (url: unknown) =>
        String(url).endsWith(PATCH_SUFFIX) ? res({}, 404) : res(),
      )

      await syncHubSpotContact('tok', { email: 'a@b.com', subscription: 'pro', username: 'gamer' })

      const create = fetchMock.mock.calls.find(
        (c) => isUrl(c, '/objects/contacts') && (c[1] as { method?: string }).method === 'POST',
      )
      expect(create).toBeDefined()
      expect(bodyOf(create as unknown[]).properties).toMatchObject({
        email: 'a@b.com',
        dotabod_subscription: 'pro',
        twitch_username: 'gamer',
      })
    })

    it('never throws and reports to Sentry when the patch fails', async () => {
      const { fetchMock, captureException, syncHubSpotContact } = await load()
      fetchMock.mockImplementation(async (url: unknown) =>
        String(url).endsWith(PATCH_SUFFIX) ? res({}, 500) : res(),
      )

      await expect(
        syncHubSpotContact('tok', { email: 'a@b.com', subscription: 'pro', username: 'g' }),
      ).resolves.toBeUndefined()
      expect(captureException).toHaveBeenCalled()
    })

    it('reports a non-409 property-create failure without throwing or upserting', async () => {
      const { fetchMock, captureException, syncHubSpotContact } = await load()
      fetchMock.mockImplementation(async (url: unknown) =>
        String(url).endsWith('/properties/contacts') ? res({}, 400) : res(),
      )

      await expect(
        syncHubSpotContact('tok', { email: 'a@b.com', subscription: 'pro', username: 'g' }),
      ).resolves.toBeUndefined()
      expect(captureException).toHaveBeenCalled()
      expect(fetchMock.mock.calls.some((c) => isUrl(c, '/contacts/batch/upsert'))).toBe(false)
    })
  })
})
