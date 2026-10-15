import { afterEach, describe, expect, it, vi } from 'vitest'

import { createCheckoutSession } from '@/lib/stripe'
import { LIVE_SUBSCRIPTION_CODE } from '@/lib/stripe/live-subscription'

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })

const requestedPaths = (fetchSpy: { mock: { calls: Parameters<typeof fetch>[] } }) =>
  fetchSpy.mock.calls.map(([input]) => String(input))

describe(createCheckoutSession, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the checkout url on success', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, { url: 'https://checkout.stripe.com/c/pay/cs_1' }))

    await expect(createCheckoutSession('price_mo', 'user_1')).resolves.toStrictEqual({
      url: 'https://checkout.stripe.com/c/pay/cs_1',
    })
    expect(requestedPaths(fetchSpy)).toStrictEqual(['/api/stripe/create-checkout'])
  })

  it('sends a user who already has a live plan to the billing portal', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(409, { code: LIVE_SUBSCRIPTION_CODE }))
      .mockResolvedValueOnce(jsonResponse(200, { url: 'https://billing.stripe.com/p/session_1' }))

    await expect(createCheckoutSession('price_mo', 'user_1')).resolves.toStrictEqual({
      url: 'https://billing.stripe.com/p/session_1',
    })
    expect(requestedPaths(fetchSpy)).toStrictEqual([
      '/api/stripe/create-checkout',
      '/api/stripe/portal',
    ])
  })

  it('fails when the billing portal cannot be opened', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(409, { code: LIVE_SUBSCRIPTION_CODE }))
      .mockResolvedValueOnce(jsonResponse(500, { error: 'Failed to create Stripe portal session' }))

    await expect(createCheckoutSession('price_mo', 'user_1')).rejects.toThrow(
      'Failed to open the billing portal',
    )
  })

  it('does not open the portal for an unrelated conflict', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(409, { code: 'SOMETHING_ELSE' }))

    await expect(createCheckoutSession('price_mo', 'user_1')).rejects.toThrow(
      'Failed to create checkout session',
    )
    expect(requestedPaths(fetchSpy)).toStrictEqual(['/api/stripe/create-checkout'])
  })
})
