import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node-fetch', () => ({ default: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

// Fresh module graph per test so the memoized property-creation promise resets.
async function load() {
  const fetchMod = await import('node-fetch')
  const sentry = await import('@sentry/nextjs')
  const mod = await import('@/lib/hubspot')
  return {
    fetchMock: vi.mocked(fetchMod.default),
    captureException: vi.mocked(sentry.captureException),
    ...mod,
  }
}

const res = (body: unknown = {}, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async () => body,
    // biome-ignore lint/suspicious/noExplicitAny: minimal fetch Response stub for tests
  }) as any

const isUrl = (call: unknown[], suffix: string) => String(call[0]).endsWith(suffix)
// biome-ignore lint/suspicious/noExplicitAny: reading the stringified request body
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
        subscriptionToValue({ tier: 'PRO', transactionType: 'LIFETIME', status: 'ACTIVE' }),
      ).toBe('pro_lifetime')
      expect(subscriptionToValue({ tier: 'PRO', status: 'TRIALING' })).toBe('pro_trial')
      expect(subscriptionToValue({ tier: 'PRO', status: 'PAST_DUE' })).toBe('pro_past_due')
      expect(subscriptionToValue({ tier: 'PRO', status: 'ACTIVE' })).toBe('pro')
    })
  })

  describe('syncHubSpotContact', () => {
    it('creates both properties and upserts the contact by email with the subscription', async () => {
      const { fetchMock, syncHubSpotContact } = await load()
      fetchMock.mockResolvedValue(res())

      await syncHubSpotContact('tok', { email: 'a@b.com', username: 'gamer', subscription: 'pro' })

      const propertyCalls = fetchMock.mock.calls.filter((c) => isUrl(c, '/properties/contacts'))
      expect(propertyCalls).toHaveLength(2)

      const upsert = fetchMock.mock.calls.find((c) => isUrl(c, '/contacts/batch/upsert'))
      expect(upsert).toBeDefined()
      expect(bodyOf(upsert as unknown[]).inputs[0]).toMatchObject({
        id: 'a@b.com',
        idProperty: 'email',
        properties: { twitch_username: 'gamer', dotabod_subscription: 'pro' },
      })
    })

    it('omits dotabod_subscription when no subscription value is provided', async () => {
      const { fetchMock, syncHubSpotContact } = await load()
      fetchMock.mockResolvedValue(res())

      await syncHubSpotContact('tok', { email: 'a@b.com', username: 'gamer' })

      const upsert = fetchMock.mock.calls.find((c) => isUrl(c, '/contacts/batch/upsert'))
      expect(bodyOf(upsert as unknown[]).inputs[0].properties).toEqual({ twitch_username: 'gamer' })
    })

    it('treats a 409 on property creation as success and still upserts', async () => {
      const { fetchMock, syncHubSpotContact } = await load()
      fetchMock.mockImplementation(async (url: unknown) =>
        String(url).endsWith('/properties/contacts') ? res({}, 409) : res(),
      )

      await syncHubSpotContact('tok', { email: 'a@b.com', username: 'g', subscription: 'pro' })

      expect(fetchMock.mock.calls.some((c) => isUrl(c, '/contacts/batch/upsert'))).toBe(true)
    })

    it('never throws and reports to Sentry when the upsert fails', async () => {
      const { fetchMock, captureException, syncHubSpotContact } = await load()
      fetchMock.mockImplementation(async (url: unknown) =>
        String(url).endsWith('/contacts/batch/upsert') ? res({}, 500) : res(),
      )

      await expect(
        syncHubSpotContact('tok', { email: 'a@b.com', username: 'g', subscription: 'pro' }),
      ).resolves.toBeUndefined()
      expect(captureException).toHaveBeenCalled()
    })

    it('reports a non-409 property-create failure without throwing or upserting', async () => {
      const { fetchMock, captureException, syncHubSpotContact } = await load()
      fetchMock.mockImplementation(async (url: unknown) =>
        String(url).endsWith('/properties/contacts') ? res({}, 400) : res(),
      )

      await expect(
        syncHubSpotContact('tok', { email: 'a@b.com', username: 'g', subscription: 'pro' }),
      ).resolves.toBeUndefined()
      expect(captureException).toHaveBeenCalled()
      expect(fetchMock.mock.calls.some((c) => isUrl(c, '/contacts/batch/upsert'))).toBe(false)
    })
  })
})
