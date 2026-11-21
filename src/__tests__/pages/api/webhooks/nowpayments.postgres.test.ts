// @vitest-environment node
import { createHmac, randomUUID } from 'node:crypto'

import { afterAll, afterEach, describe, expect, it } from 'vitest'

import prisma from '@/lib/db'
import type { NowPaymentsPaymentStatus } from '@/lib/nowpayments'
import { recordNowPaymentsProgress } from '@/lib/nowpayments-progress'

const webhookOrigin = process.env.NOWPAYMENTS_TEST_WEBHOOK_ORIGIN
const describePostgres =
  process.env.RUN_NOWPAYMENTS_POSTGRES_TESTS === 'true' ? describe : describe.skip

describePostgres('NOWPayments invoice progress in PostgreSQL', () => {
  const userIds = new Set<string>()

  const createInvoice = async () => {
    const id = randomUUID()
    const user = await prisma.user.create({ data: { name: `test-${id}` } })
    userIds.add(user.id)
    return await prisma.nowPaymentsInvoice.create({
      data: {
        hostedInvoiceUrl: 'https://example.com/',
        nowPaymentsId: id,
        priceAmount: 6,
        priceCurrency: 'usd',
        status: 'waiting',
        stripeCustomerId: `cus_${id}`,
        stripeInvoiceId: `in_${id}`,
        userId: user.id,
      },
    })
  }

  const partialPayment = (orderId: string): NowPaymentsPaymentStatus => ({
    actually_paid: 3,
    created_at: '2026-10-15T00:05:00.000Z',
    order_description: 'Dotabod monthly subscription',
    order_id: orderId,
    outcome_amount: 3,
    outcome_currency: 'usdttrc20',
    pay_address: 'test',
    pay_amount: 6,
    pay_currency: 'usdttrc20',
    payment_id: 1234,
    payment_status: 'partially_paid',
    price_amount: 6,
    price_currency: 'usd',
    purchase_id: 1,
    updated_at: '2026-10-15T00:06:00.000Z',
  })

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [...userIds] } } })
    userIds.clear()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('keeps a finished invoice when progress writes from a stale read', async () => {
    const waiting = await createInvoice()
    await prisma.nowPaymentsInvoice.update({
      data: { actuallyPaid: 6, lastWebhookAt: new Date(), status: 'finished' },
      where: { id: waiting.id },
    })

    await recordNowPaymentsProgress(waiting, partialPayment(waiting.stripeInvoiceId))

    const invoice = await prisma.nowPaymentsInvoice.findUniqueOrThrow({ where: { id: waiting.id } })
    expect(invoice.status).toBe('finished')
    expect(invoice.actuallyPaid).toBe(6)
  })

  it('warns once when two sources deliver the same partially paid status', async () => {
    const waiting = await createInvoice()
    const payment = partialPayment(waiting.stripeInvoiceId)
    let warnings = 0
    const onPartiallyPaid = () => {
      warnings += 1
    }

    await Promise.all([
      recordNowPaymentsProgress(waiting, payment, onPartiallyPaid),
      recordNowPaymentsProgress(waiting, payment, onPartiallyPaid),
    ])

    const invoice = await prisma.nowPaymentsInvoice.findUniqueOrThrow({ where: { id: waiting.id } })
    expect(invoice.status).toBe('partially_paid')
    expect(invoice.paymentId).toBe('1234')
    expect(warnings).toBe(1)
  })

  it.runIf(webhookOrigin !== undefined)('honors signed progress over HTTP', async () => {
    const waiting = await createInvoice()
    const endpoint = `${webhookOrigin}/api/webhooks/nowpayments`
    const secret = process.env.NOWPAYMENTS_IPN_SECRET
    if (secret === undefined) {
      throw new Error('Set NOWPAYMENTS_IPN_SECRET for the webhook HTTP check')
    }
    const body = JSON.stringify({
      actually_paid: 3,
      order_id: waiting.stripeInvoiceId,
      pay_amount: 6,
      pay_currency: 'usdttrc20',
      payment_id: 1234,
      payment_status: 'confirming',
    })
    const signature = createHmac('sha512', secret).update(body).digest('hex')
    const send = async (value: string) =>
      await fetch(endpoint, {
        body,
        headers: { 'Content-Type': 'application/json', 'x-nowpayments-sig': value },
        method: 'POST',
      })
    const read = async () =>
      await prisma.nowPaymentsInvoice.findUniqueOrThrow({ where: { id: waiting.id } })

    const rejected = await send('invalid')
    expect(rejected.status).toBe(400)
    expect((await read()).status).toBe('waiting')

    const accepted = await send(signature)
    expect(accepted.status).toBe(200)
    expect((await read()).status).toBe('confirming')

    await prisma.nowPaymentsInvoice.update({
      data: { actuallyPaid: 6, status: 'finished' },
      where: { id: waiting.id },
    })

    const late = await send(signature)
    expect(late.status).toBe(200)
    const finished = await read()
    expect(finished.status).toBe('finished')
    expect(finished.actuallyPaid).toBe(6)
  })
})
