import { describe, expect, it, vi } from 'vitest'

import { expireLapsedSubscriptions } from '@/lib/expire-lapsed-subscriptions'
import { PayPalApiError } from '@/lib/paypal'

type Dependencies = NonNullable<Parameters<typeof expireLapsedSubscriptions>[0]>
type Lapsed = Awaited<ReturnType<Dependencies['store']['findLapsed']>>[number]

const now = new Date('2026-11-18T12:00:00.000Z')
const threeDaysBeforeNow = new Date('2026-11-15T12:00:00.000Z')

const lapsed = (stripeSubscriptionId: string): Lapsed => ({
  id: `row_${stripeSubscriptionId}`,
  metadata: { priceType: 'monthly' },
  stripeSubscriptionId,
})

const createFakes = (rows: Lapsed[]) => {
  const expire = vi.fn<Dependencies['store']['expire']>().mockResolvedValue(true)
  const findLapsed = vi.fn<Dependencies['store']['findLapsed']>().mockResolvedValue(rows)
  const syncPaypal = vi.fn<Dependencies['syncPaypal']>().mockResolvedValue(true)
  const reportFailure = vi.fn<Dependencies['reportFailure']>()
  const dependencies: Dependencies = {
    now: () => now,
    reportFailure,
    store: { expire, findLapsed },
    syncPaypal,
  }
  return { dependencies, expire, findLapsed, reportFailure, syncPaypal }
}

describe(expireLapsedSubscriptions, () => {
  it('only looks at periods that ended more than three days ago', async () => {
    const { dependencies, findLapsed } = createFakes([])

    await expireLapsedSubscriptions(dependencies)

    expect(findLapsed).toHaveBeenCalledWith(threeDaysBeforeNow, 50)
  })

  it('expires a lapsed crypto subscription', async () => {
    const row = lapsed('crypto_opennode_in_1')
    const { dependencies, expire, syncPaypal } = createFakes([row])

    const summary = await expireLapsedSubscriptions(dependencies)

    expect(expire).toHaveBeenCalledWith(row, threeDaysBeforeNow, now)
    expect(syncPaypal).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ checked: 1, expired: 1, failed: 0 })
  })

  it('lets PayPal decide when it still knows the subscription', async () => {
    const { dependencies, expire, syncPaypal } = createFakes([lapsed('paypal_I-ABC123')])

    const summary = await expireLapsedSubscriptions(dependencies)

    expect(syncPaypal).toHaveBeenCalledWith('I-ABC123')
    expect(expire).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ expired: 0, resynced: 1 })
  })

  it('expires a PayPal row that has nothing left to sync from', async () => {
    const { dependencies, expire, syncPaypal } = createFakes([lapsed('paypal_I-GONE')])
    syncPaypal.mockResolvedValue(false)

    const summary = await expireLapsedSubscriptions(dependencies)

    expect(expire).toHaveBeenCalledOnce()
    expect(summary).toMatchObject({ expired: 1, resynced: 0 })
  })

  it('expires a PayPal row that PayPal has no record of', async () => {
    const { dependencies, expire, reportFailure, syncPaypal } = createFakes([
      lapsed('paypal_I-UNKNOWN'),
    ])
    syncPaypal.mockRejectedValue(new PayPalApiError(404, 'PayPal GET failed: 404'))

    const summary = await expireLapsedSubscriptions(dependencies)

    expect(expire).toHaveBeenCalledOnce()
    expect(reportFailure).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ expired: 1, failed: 0 })
  })

  it('keeps a PayPal row when PayPal fails for another reason', async () => {
    const { dependencies, expire, syncPaypal } = createFakes([lapsed('paypal_I-BUSY')])
    syncPaypal.mockRejectedValue(new PayPalApiError(503, 'PayPal GET failed: 503'))

    const summary = await expireLapsedSubscriptions(dependencies)

    expect(expire).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ expired: 0, failed: 1 })
  })

  it('counts a row renewed since it was read as unchanged', async () => {
    const { dependencies, expire } = createFakes([lapsed('crypto_cs_1')])
    expire.mockResolvedValue(false)

    const summary = await expireLapsedSubscriptions(dependencies)

    expect(summary).toMatchObject({ expired: 0, unchanged: 1 })
  })

  it('reports a failure and carries on with the rest', async () => {
    const failing = lapsed('paypal_I-DOWN')
    const { dependencies, reportFailure, syncPaypal } = createFakes([
      failing,
      lapsed('crypto_cs_2'),
    ])
    syncPaypal.mockRejectedValue(new Error('PayPal unavailable'))

    const summary = await expireLapsedSubscriptions(dependencies)

    expect(reportFailure).toHaveBeenCalledWith(failing, new Error('PayPal unavailable'))
    expect(summary).toMatchObject({ checked: 2, expired: 1, failed: 1 })
  })
})
