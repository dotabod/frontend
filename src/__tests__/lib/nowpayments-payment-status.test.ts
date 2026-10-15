import type { NowPaymentsInvoice } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { describe, expect, it, vi } from 'vitest'

import { sendNowPaymentsStatus } from '@/lib/nowpayments-payment-status'

type Store = NonNullable<Parameters<typeof sendNowPaymentsStatus>[3]>
type StripeInvoice = Parameters<typeof sendNowPaymentsStatus>[2]

const stripeInvoice: StripeInvoice = {
  amount_due: 600,
  currency: 'usd',
  id: 'in_1',
  number: 'F3F91300-0012',
  status: 'open',
}

const nowPaymentsInvoice: NowPaymentsInvoice = {
  actuallyPaid: null,
  createdAt: new Date('2026-10-14T20:00:00.000Z'),
  hostedInvoiceUrl: 'https://nowpayments.io/payment/?iid=np_inv_1',
  id: 'row_1',
  lastWebhookAt: null,
  metadata: {},
  nowPaymentsId: 'np_inv_1',
  payAmount: null,
  payCurrency: null,
  paymentId: null,
  priceAmount: 6,
  priceCurrency: 'usd',
  status: 'waiting',
  stripeCustomerId: 'cus_1',
  stripeInvoiceId: 'in_1',
  updatedAt: new Date('2026-10-14T20:00:00.000Z'),
  userId: 'user_1',
}

const createStore = (row: NowPaymentsInvoice | null, credited = false) => {
  const findInvoice = vi.fn<Store['findInvoice']>().mockResolvedValue(row)
  const hasBeenCredited = vi.fn<Store['hasBeenCredited']>().mockResolvedValue(credited)
  return { findInvoice, hasBeenCredited, store: { findInvoice, hasBeenCredited } }
}

const poll = async (status: string, credited = false) => {
  const { res } = createMocks<NextApiRequest, NextApiResponse>()
  const fakes = createStore({ ...nowPaymentsInvoice, status }, credited)
  await sendNowPaymentsStatus(res, 'in_1', stripeInvoice, fakes.store)
  return { fakes, res }
}

describe(sendNowPaymentsStatus, () => {
  it('finds the NOWPayments invoice by the Stripe invoice id on the return URL', async () => {
    const { fakes, res } = await poll('waiting')

    expect(res._getStatusCode()).toBe(200)
    expect(fakes.findInvoice).toHaveBeenCalledExactlyOnceWith('in_1')
    expect(res._getJSONData()).toMatchObject({
      amount: 6,
      chargeId: 'np_inv_1',
      currency: 'usd',
      invoice: { amount: 6, id: 'in_1', number: 'F3F91300-0012', status: 'open' },
      invoiceId: 'in_1',
      status: 'waiting',
    })
  })

  it('answers 404 when there is no NOWPayments invoice for the Stripe invoice', async () => {
    const { res } = createMocks<NextApiRequest, NextApiResponse>()
    const fakes = createStore(null)

    await sendNowPaymentsStatus(res, 'in_1', stripeInvoice, fakes.store)

    expect(res._getStatusCode()).toBe(404)
    expect(res._getJSONData()).toStrictEqual({ error: 'Payment not found' })
    expect(fakes.hasBeenCredited).not.toHaveBeenCalled()
  })

  it.each([
    ['waiting', 'processing', 'Waiting for your payment'],
    ['confirming', 'processing', 'Payment is processing on the blockchain'],
    ['confirmed', 'processing', 'Payment is processing on the blockchain'],
    ['sending', 'processing', 'Payment is processing on the blockchain'],
    ['partially_paid', 'error', 'Payment amount insufficient'],
    ['failed', 'error', 'Payment failed'],
    ['expired', 'expired', 'Payment link has expired'],
    ['refunded', 'warning', 'Payment was refunded'],
    ['something_new', 'unknown', 'Payment status unknown'],
  ])('reports a %s payment as %s', async (status, type, message) => {
    const { res } = await poll(status)

    expect(res._getJSONData()).toMatchObject({ statusInfo: { message, type } })
  })

  it('reports a finished payment as active once its subscription exists', async () => {
    const { fakes, res } = await poll('finished', true)

    expect(fakes.hasBeenCredited).toHaveBeenCalledExactlyOnceWith('in_1')
    expect(res._getJSONData()).toMatchObject({
      status: 'finished',
      statusInfo: { message: 'Payment completed successfully', type: 'success' },
    })
  })

  it('does not call a finished payment active when no subscription was created for it', async () => {
    const { res } = await poll('finished', false)

    expect(res._getJSONData()).toMatchObject({
      status: 'finished',
      statusInfo: { message: 'Payment received, activation needs attention', type: 'warning' },
    })
  })
})
