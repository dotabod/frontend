import { PrismaClient } from '@prisma/client'
import type { Subscription } from '@prisma/client'
import { Stripe } from 'stripe'
import { describe, expect, it, vi } from 'vitest'

import { handleInvoiceEvent } from '@/lib/stripe/handlers/invoice-events'

const testStripe = new Stripe('sk_test_dummy')
const webhookSecret = 'whsec_test'

interface InvoiceMetadata {
  isCryptoPayment: string
  paymentProvider?: string
  stripePriceId?: string
  userId: string
}

interface InvoiceFixture {
  dueDate?: number
  metadata: InvoiceMetadata
  status: string
}

const buildInvoice = function buildInvoice(fixture: InvoiceFixture): Stripe.Invoice {
  const payload = JSON.stringify({
    data: {
      object: {
        customer: 'cus_crypto',
        due_date: fixture.dueDate,
        id: 'in_crypto',
        lines: { data: [] },
        metadata: fixture.metadata,
        object: 'invoice',
        status: fixture.status,
      },
    },
    id: 'evt_crypto',
    object: 'event',
    type: 'invoice.paid',
  })
  const event = testStripe.webhooks.constructEvent(
    payload,
    testStripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret }),
    webhookSecret,
  )
  if (event.type !== 'invoice.paid') {
    throw new Error('fixture must be an invoice.paid event')
  }
  return event.data.object
}

const firstPurchase = buildInvoice({
  metadata: { isCryptoPayment: 'true', paymentProvider: 'nowpayments', userId: 'user_crypto' },
  status: 'paid',
})
const renewal = buildInvoice({
  metadata: { isCryptoPayment: 'true', userId: 'user_crypto' },
  status: 'paid',
})
const overdueCheckout = buildInvoice({
  dueDate: 1_700_000_000,
  metadata: { isCryptoPayment: 'true', paymentProvider: 'nowpayments', userId: 'user_crypto' },
  status: 'open',
})

const creditedSubscription: Subscription = {
  cancelAtPeriodEnd: true,
  createdAt: new Date('2026-10-11T17:00:00.000Z'),
  currentPeriodEnd: new Date('2026-11-11T17:00:00.000Z'),
  id: 'sub_credited',
  isGift: false,
  metadata: {},
  status: 'ACTIVE',
  stripeCustomerId: 'cus_crypto',
  stripePriceId: 'price_monthly',
  stripeSubscriptionId: 'crypto_opennode_in_crypto',
  tier: 'PRO',
  transactionType: 'RECURRING',
  updatedAt: new Date('2026-10-11T17:00:00.000Z'),
  userId: 'user_crypto',
}

const createTransaction = (existingCredit: Subscription | null) => {
  const tx = new PrismaClient()
  vi.spyOn(tx, '$executeRaw').mockResolvedValue(0)
  const findFirst = vi.spyOn(tx.subscription, 'findFirst').mockResolvedValue(existingCredit)
  const create = vi.spyOn(tx.subscription, 'create').mockResolvedValue(creditedSubscription)
  const update = vi.spyOn(tx.subscription, 'update').mockResolvedValue(creditedSubscription)
  return { create, findFirst, tx, update }
}

describe(handleInvoiceEvent, () => {
  describe('a crypto invoice that was already credited', () => {
    it('is not credited a second time when Stripe repeats the payment', async () => {
      const { create, findFirst, tx, update } = createTransaction(creditedSubscription)

      const handled = await handleInvoiceEvent(firstPurchase, tx)

      expect(handled).toBeTruthy()
      expect(create).not.toHaveBeenCalled()
      expect(update).not.toHaveBeenCalled()
      expect(findFirst).toHaveBeenCalledOnce()
    })

    it('does not extend a renewal a second time either', async () => {
      const { update, tx } = createTransaction(creditedSubscription)

      const handled = await handleInvoiceEvent(renewal, tx)

      expect(handled).toBeTruthy()
      expect(update).not.toHaveBeenCalled()
    })
  })

  describe('failures that used to be reported as success', () => {
    it('fails a paid crypto invoice that has no price to credit', async () => {
      const { create, tx } = createTransaction(null)

      const handled = await handleInvoiceEvent(firstPurchase, tx)

      expect(handled).toBeFalsy()
      expect(create).not.toHaveBeenCalled()
    })

    it('fails a paid renewal invoice that matches no subscription and was never credited', async () => {
      const { tx, update } = createTransaction(null)

      const handled = await handleInvoiceEvent(renewal, tx)

      expect(handled).toBeFalsy()
      expect(update).not.toHaveBeenCalled()
    })
  })

  describe('deliberate skips that must stay successful', () => {
    it('accepts an abandoned checkout that went overdue and has no subscription to move', async () => {
      const { tx, update } = createTransaction(null)

      const handled = await handleInvoiceEvent(overdueCheckout, tx)

      expect(handled).toBeTruthy()
      expect(update).not.toHaveBeenCalled()
    })
  })
})
