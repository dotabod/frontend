import { afterEach, describe, expect, it, vi } from 'vitest'

import { getNowPaymentsPayment } from '@/lib/nowpayments'

const respondWith = (body: object, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe(getNowPaymentsPayment, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads one payment by id with the API key', async () => {
    vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
    const fetchSpy = respondWith({
      actually_paid: 6.05,
      order_id: 'in_1',
      payment_id: 9999,
      payment_status: 'finished',
    })

    const payment = await getNowPaymentsPayment('9999')

    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith('https://api.nowpayments.io/v1/payment/9999', {
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-api-key' },
      method: 'GET',
    })
    expect(payment).toMatchObject({
      order_id: 'in_1',
      payment_id: 9999,
      payment_status: 'finished',
    })
  })

  it('rejects a body that is not a payment', async () => {
    vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
    respondWith({ message: 'something else' })

    await expect(getNowPaymentsPayment('9999')).rejects.toThrow(
      'NOWPayments returned an unexpected body for payment 9999',
    )
  })

  it('rejects when NOWPayments answers with an error status', async () => {
    vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
    respondWith({ message: 'Payment not found' }, 404)

    await expect(getNowPaymentsPayment('9999')).rejects.toThrow(/failed: 404/u)
  })
})
