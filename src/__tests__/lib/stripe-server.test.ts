import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const ctorSpy = vi.fn()

vi.mock('stripe', () => ({
  default: class {
    customers = { retrieve: vi.fn() }
    constructor(...args: unknown[]) {
      ctorSpy(...args)
    }
  },
}))

async function load() {
  return import('@/lib/stripe-server')
}

describe('lib/stripe-server', () => {
  beforeEach(() => {
    vi.resetModules()
    ctorSpy.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not throw on import when STRIPE_SECRET_KEY is missing', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    await expect(load()).resolves.toBeDefined()
    expect(ctorSpy).not.toHaveBeenCalled()
  })

  it('throws only when the client is actually used without a key', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    const { stripe } = await load()
    expect(() => stripe.customers).toThrow('Missing STRIPE_SECRET_KEY environment variable')
  })

  it('lazily constructs and memoizes the client when a key is present', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123')
    const { stripe } = await load()

    expect(ctorSpy).not.toHaveBeenCalled()

    expect(stripe.customers).toBeDefined()
    void stripe.customers

    expect(ctorSpy).toHaveBeenCalledTimes(1)
    expect(ctorSpy).toHaveBeenCalledWith('sk_test_123', {
      apiVersion: '2025-03-31.basil',
      typescript: true,
    })
  })
})
