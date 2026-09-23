import { PrismaClient } from '@prisma/client'
import { Stripe } from 'stripe'
import { describe, expect, it, vi } from 'vitest'

import { stripe } from '@/lib/stripe-server'
import { handleInvoiceEvent } from '@/lib/stripe/handlers/invoice-events'

const testStripe = new Stripe('sk_test_dummy')
const webhookSecret = 'whsec_test'
const payload = JSON.stringify({
  data: {
    object: {
      customer: 'cus_crypto',
      id: 'in_nowpayments',
      lines: { data: [] },
      metadata: {
        isCryptoPayment: 'true',
        isUpgradeToLifetime: 'false',
        paymentProvider: 'nowpayments',
        stripePriceId: 'price_monthly',
        userId: 'user_crypto',
      },
      object: 'invoice',
      status: 'paid',
    },
  },
  id: 'evt_nowpayments',
  object: 'event',
  type: 'invoice.paid',
})
const event = testStripe.webhooks.constructEvent(
  payload,
  testStripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret }),
  webhookSecret,
)

describe('crypto invoice handling', () => {
  it('creates a Pro subscription when a NOWPayments invoice is paid', async () => {
    if (event.type !== 'invoice.paid') {
      throw new Error('fixture must be an invoice.paid event')
    }
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy')
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: only the renewal invoice id is read.
    const renewalInvoice = { id: 'in_renewal' } as Stripe.Response<Stripe.Invoice>
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: only unit_amount is read.
    const price = { unit_amount: 600 } as Stripe.Response<Stripe.Price>
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: the invoice item is not read.
    const invoiceItem = {} as Stripe.Response<Stripe.InvoiceItem>
    vi.spyOn(stripe.invoices, 'create').mockResolvedValue(renewalInvoice)
    vi.spyOn(stripe.prices, 'retrieve').mockResolvedValue(price)
    vi.spyOn(stripe.invoiceItems, 'create').mockResolvedValue(invoiceItem)
    const tx = new PrismaClient()
    vi.spyOn(tx, '$executeRaw').mockResolvedValue(0)
    vi.spyOn(tx.subscription, 'findFirst').mockResolvedValue(null)
    vi.spyOn(tx.subscription, 'findMany').mockResolvedValue([])
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: the created row is not read.
    const createdRow = {} as Awaited<ReturnType<typeof tx.subscription.create>>
    const create = vi.spyOn(tx.subscription, 'create').mockResolvedValue(createdRow)

    const handled = await handleInvoiceEvent(event.data.object, tx)

    expect(handled).toBeTruthy()
    expect(create).toHaveBeenCalledOnce()
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      status: 'ACTIVE',
      tier: 'PRO',
      userId: 'user_crypto',
    })
  })
})
