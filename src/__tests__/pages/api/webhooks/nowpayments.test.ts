import crypto from 'node:crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')
vi.stubEnv('VERCEL_ENV', 'production')

const mocks = vi.hoisted(() => ({
  prisma: {
    nowPaymentsInvoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  processConfirmedNowPaymentsPayment: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ default: mocks.prisma }))
vi.mock('@/lib/nowpayments-payment', () => ({
  processConfirmedNowPaymentsPayment: mocks.processConfirmedNowPaymentsPayment,
}))

let handler: typeof import('@/pages/api/webhooks/nowpayments/index').default

beforeAll(async () => {
  ;({ default: handler } = await import('@/pages/api/webhooks/nowpayments/index'))
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

function sign(body: Record<string, unknown>): string {
  return crypto
    .createHmac('sha512', 'test-ipn-secret')
    .update(JSON.stringify(sortObject(body)))
    .digest('hex')
}

function buildReq(body: Record<string, unknown>, signature?: string) {
  return createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
    headers: signature ? { 'x-nowpayments-sig': signature } : {},
    body,
  })
}

const finishedBody = {
  payment_id: 9999,
  invoice_id: 4242,
  payment_status: 'finished',
  pay_address: 'TXYZ',
  price_amount: 13,
  price_currency: 'usd',
  pay_amount: 13.05,
  actually_paid: 13.05,
  pay_currency: 'usdttrc20',
  order_id: 'in_1',
}

describe('POST /api/webhooks/nowpayments', () => {
  beforeEach(() => {
    vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
    vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')
    vi.stubEnv('VERCEL_ENV', 'production')
  })

  it('rejects non-POST methods with 405', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(405)
  })

  it('rejects an invalid signature in production', async () => {
    const { req, res } = buildReq(finishedBody, 'deadbeef')
    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
    expect(mocks.processConfirmedNowPaymentsPayment).not.toHaveBeenCalled()
  })

  it('rejects a request with no signature header', async () => {
    const { req, res } = buildReq(finishedBody)
    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  it('rejects an invalid signature on Vercel preview deployments (not just production)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'preview')
    const { req, res } = buildReq(finishedBody, 'deadbeef')
    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
    expect(mocks.processConfirmedNowPaymentsPayment).not.toHaveBeenCalled()
  })

  it('returns 200 OK for a signed but malformed payload missing required fields', async () => {
    const bad = { foo: 'bar' }
    const sig = sign(bad)
    const { req, res } = buildReq(bad, sig)
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(mocks.prisma.nowPaymentsInvoice.findUnique).not.toHaveBeenCalled()
  })

  it('returns 200 and ignores when the invoice is unknown', async () => {
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue(null)
    const { req, res } = buildReq(finishedBody, sign(finishedBody))
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(mocks.processConfirmedNowPaymentsPayment).not.toHaveBeenCalled()
  })

  it('processes a finished payment', async () => {
    const invoice = { nowPaymentsId: 'np_inv_1', stripeInvoiceId: 'in_1', status: 'waiting' }
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue(invoice)
    mocks.processConfirmedNowPaymentsPayment.mockResolvedValue({ reason: 'processed' })

    const { req, res } = buildReq(finishedBody, sign(finishedBody))
    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(mocks.processConfirmedNowPaymentsPayment).toHaveBeenCalledWith(
      invoice,
      expect.objectContaining({ payment_status: 'finished', payment_id: 9999 }),
    )
  })

  it('updates status only for non-terminal events like confirming', async () => {
    const confirmingBody = { ...finishedBody, payment_status: 'confirming' }
    const invoice = {
      nowPaymentsId: 'np_inv_1',
      stripeInvoiceId: 'in_1',
      status: 'waiting',
      lastWebhookAt: null,
    }
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue(invoice)

    const { req, res } = buildReq(confirmingBody, sign(confirmingBody))
    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(mocks.processConfirmedNowPaymentsPayment).not.toHaveBeenCalled()
    expect(mocks.prisma.nowPaymentsInvoice.update).toHaveBeenCalledWith({
      where: { nowPaymentsId: 'np_inv_1' },
      data: expect.objectContaining({ status: 'confirming' }),
    })
  })

  it('skips a duplicate non-confirmed webhook (same status, already seen)', async () => {
    const confirmingBody = { ...finishedBody, payment_status: 'confirming' }
    const invoice = {
      nowPaymentsId: 'np_inv_1',
      stripeInvoiceId: 'in_1',
      status: 'confirming',
      lastWebhookAt: new Date('2026-05-18T00:00:00.000Z'),
    }
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue(invoice)

    const { req, res } = buildReq(confirmingBody, sign(confirmingBody))
    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(mocks.prisma.nowPaymentsInvoice.update).not.toHaveBeenCalled()
  })

  it('returns 500 when payment processing throws so NOWPayments retries', async () => {
    const invoice = { nowPaymentsId: 'np_inv_1', stripeInvoiceId: 'in_1', status: 'waiting' }
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue(invoice)
    mocks.processConfirmedNowPaymentsPayment.mockRejectedValue(new Error('boom'))

    const { req, res } = buildReq(finishedBody, sign(finishedBody))
    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
  })
})
