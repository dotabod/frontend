import { afterEach, describe, expect, it, vi } from 'vitest'

import { getSubscription, PayPalApiError } from '@/lib/paypal'

describe(getSubscription, () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('carries the status of a failed PayPal request', async () => {
    vi.stubEnv('PAYPAL_API_BASE', 'https://paypal.test')
    vi.stubEnv('PAYPAL_CLIENT_ID', 'client')
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'secret')
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json({ access_token: 'token' }))
        .mockResolvedValueOnce(Response.json({ name: 'RESOURCE_NOT_FOUND' }, { status: 404 })),
    )

    const request = getSubscription('I-UNKNOWN')

    await expect(request).rejects.toBeInstanceOf(PayPalApiError)
    await expect(request).rejects.toMatchObject({ status: 404 })
    await expect(request).rejects.toThrow('RESOURCE_NOT_FOUND')
  })
})
