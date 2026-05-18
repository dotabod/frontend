import crypto from 'node:crypto'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')

let verifyNowPaymentsSignature: typeof import('@/lib/nowpayments').verifyNowPaymentsSignature
let isNowPaymentsConfirmed: typeof import('@/lib/nowpayments').isNowPaymentsConfirmed

beforeAll(async () => {
  const mod = await import('@/lib/nowpayments')
  verifyNowPaymentsSignature = mod.verifyNowPaymentsSignature
  isNowPaymentsConfirmed = mod.isNowPaymentsConfirmed
})

beforeEach(() => {
  vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
  vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')
})

function sortObject<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => sortObject(v)) as unknown as T
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortObject((value as Record<string, unknown>)[key])
    }
    return sorted as unknown as T
  }
  return value
}

function sign(body: Record<string, unknown>, secret = 'test-ipn-secret'): string {
  return crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(sortObject(body)))
    .digest('hex')
}

describe('verifyNowPaymentsSignature', () => {
  it('accepts a valid signature', () => {
    const body = {
      payment_id: 123,
      payment_status: 'finished',
      order_id: 'in_test_1',
      pay_amount: 12.5,
      pay_currency: 'usdttrc20',
    }
    const sig = sign(body)
    expect(verifyNowPaymentsSignature(body, sig)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const body = {
      payment_id: 123,
      payment_status: 'finished',
      order_id: 'in_test_1',
    }
    const sig = sign(body)
    const tampered = { ...body, payment_status: 'failed' }
    expect(verifyNowPaymentsSignature(tampered, sig)).toBe(false)
  })

  it('rejects a missing signature header', () => {
    expect(verifyNowPaymentsSignature({ payment_id: 1 }, undefined)).toBe(false)
  })

  it('rejects an array signature header', () => {
    expect(verifyNowPaymentsSignature({ payment_id: 1 }, ['sig1', 'sig2'])).toBe(false)
  })

  it('rejects a signature signed with a different secret', () => {
    const body = { payment_id: 123, payment_status: 'finished' }
    const sig = sign(body, 'wrong-secret')
    expect(verifyNowPaymentsSignature(body, sig)).toBe(false)
  })

  it('is order-independent within nested objects', () => {
    const a = { fee: { currency: 'btc', depositFee: 0.1 }, payment_id: 1 }
    const b = { payment_id: 1, fee: { depositFee: 0.1, currency: 'btc' } }
    const sig = sign(a)
    expect(verifyNowPaymentsSignature(b, sig)).toBe(true)
  })
})

describe('isNowPaymentsConfirmed', () => {
  it('returns true only for finished', () => {
    expect(isNowPaymentsConfirmed('finished')).toBe(true)
    expect(isNowPaymentsConfirmed('confirmed')).toBe(false)
    expect(isNowPaymentsConfirmed('waiting')).toBe(false)
    expect(isNowPaymentsConfirmed('partially_paid')).toBe(false)
    expect(isNowPaymentsConfirmed('failed')).toBe(false)
    expect(isNowPaymentsConfirmed(null)).toBe(false)
    expect(isNowPaymentsConfirmed(undefined)).toBe(false)
  })
})
