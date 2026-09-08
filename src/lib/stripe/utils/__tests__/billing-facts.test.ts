import { Stripe } from 'stripe'
import { describe, expect, it } from 'vitest'

import { extractBillingFacts } from '../billing-facts'

const stripe = new Stripe('sk_test_dummy')
const webhookSecret = 'billing-facts-test-secret'

const createEvent = function createEvent(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({
    created: 1_750_000_000,
    data: { object },
    id: `evt_${type.replaceAll('.', '_')}`,
    livemode: true,
    type,
  })
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret })

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

const invoice = function invoice(overrides: Record<string, unknown> = {}) {
  return {
    amount_due: 2_500,
    amount_paid: 2_500,
    amount_remaining: 0,
    attempt_count: 2,
    billing_reason: 'subscription_cycle',
    collection_method: 'charge_automatically',
    currency: 'usd',
    customer: {
      email: 'excluded@example.test',
      id: 'cus_invoice',
      name: 'Excluded Customer',
    },
    customer_email: 'excluded@example.test',
    hosted_invoice_url: 'https://excluded.example.test/invoice',
    id: 'in_paid',
    lines: {
      data: [],
      has_more: false,
      object: 'list',
      url: '/v1/invoices/in_paid/lines',
    },
    metadata: { excluded: 'value' },
    parent: {
      quote_details: null,
      subscription_details: {
        metadata: { excluded: 'value' },
        subscription: { id: 'sub_parent', metadata: { excluded: 'value' } },
      },
      type: 'subscription_details',
    },
    payments: {
      data: [
        {
          amount_paid: 1_500,
          currency: 'usd',
          id: 'inpay_charge',
          payment: {
            charge: { billing_details: { email: 'excluded@example.test' }, id: 'ch_paid' },
            type: 'charge',
          },
          status: 'paid',
          status_transitions: { canceled_at: null, paid_at: 1_750_000_100 },
        },
        {
          amount_paid: 1_000,
          currency: 'usd',
          id: 'inpay_intent',
          payment: { payment_intent: 'pi_paid', type: 'payment_intent' },
          status: 'paid',
          status_transitions: { canceled_at: null, paid_at: 1_750_000_200 },
        },
      ],
      has_more: false,
      object: 'list',
      url: '/v1/invoice_payments',
    },
    status: 'paid',
    status_transitions: {
      finalized_at: 1_749_999_900,
      marked_uncollectible_at: null,
      paid_at: 1_750_000_200,
      voided_at: null,
    },
    ...overrides,
  }
}

const subscription = function subscription(overrides: Record<string, unknown> = {}) {
  return {
    cancel_at_period_end: false,
    canceled_at: null,
    cancellation_details: null,
    customer: { email: 'excluded@example.test', id: 'cus_subscription' },
    description: 'Excluded description',
    ended_at: null,
    id: 'sub_fact',
    items: {
      data: [
        { current_period_end: 1_800_000_000, id: 'si_earlier' },
        { current_period_end: 1_810_000_000, id: 'si_later' },
      ],
      has_more: false,
      object: 'list',
      url: '/v1/subscription_items',
    },
    metadata: { excluded: 'value' },
    status: 'active',
    trial_end: null,
    trial_start: null,
    ...overrides,
  }
}

describe(extractBillingFacts, () => {
  it('returns the exact allowlisted invoice projection with complete payment evidence', () => {
    const event = createEvent('invoice.paid', invoice())

    expect(extractBillingFacts(event)).toStrictEqual({
      amountDueMinor: 2_500,
      amountPaidMinor: 2_500,
      amountRemainingMinor: 0,
      attemptCount: 2,
      billingReason: 'subscription_cycle',
      collectionMethod: 'charge_automatically',
      currency: 'usd',
      invoicePayments: [
        {
          amountPaidMinor: 1_500,
          currency: 'usd',
          paidAt: 1_750_000_100,
          paymentObjectId: 'ch_paid',
          paymentObjectType: 'charge',
          status: 'paid',
          stripeInvoicePaymentId: 'inpay_charge',
        },
        {
          amountPaidMinor: 1_000,
          currency: 'usd',
          paidAt: 1_750_000_200,
          paymentObjectId: 'pi_paid',
          paymentObjectType: 'payment_intent',
          status: 'paid',
          stripeInvoicePaymentId: 'inpay_intent',
        },
      ],
      kind: 'invoice',
      livemode: true,
      markedUncollectibleAt: null,
      occurredAt: 1_750_000_000,
      paidAt: 1_750_000_200,
      paymentEvidence: 'available',
      status: 'paid',
      stripeCustomerId: 'cus_invoice',
      stripeInvoiceId: 'in_paid',
      stripeSubscriptionId: 'sub_parent',
      version: 1,
      voidedAt: null,
    })
  })

  it.each([
    {
      eventType: 'invoice.payment_failed',
      status: 'open',
      transitions: {
        finalized_at: 1_749_999_900,
        marked_uncollectible_at: null,
        paid_at: null,
        voided_at: null,
      },
    },
    {
      eventType: 'invoice.voided',
      status: 'void',
      transitions: {
        finalized_at: 1_749_999_900,
        marked_uncollectible_at: null,
        paid_at: null,
        voided_at: 1_750_000_300,
      },
    },
    {
      eventType: 'invoice.marked_uncollectible',
      status: 'uncollectible',
      transitions: {
        finalized_at: 1_749_999_900,
        marked_uncollectible_at: 1_750_000_400,
        paid_at: null,
        voided_at: null,
      },
    },
  ])('preserves $eventType status transitions', ({ eventType, status, transitions }) => {
    const fact = extractBillingFacts(
      createEvent(
        eventType,
        invoice({ payments: undefined, status, status_transitions: transitions }),
      ),
    )

    expect(fact).toMatchObject({
      markedUncollectibleAt: transitions.marked_uncollectible_at,
      paidAt: transitions.paid_at,
      status,
      voidedAt: transitions.voided_at,
    })
  })

  it.each([
    {
      lines: [
        { parent: null, subscription: null },
        { parent: null, subscription: { id: 'sub_legacy_expanded' } },
      ],
      stripeSubscriptionId: 'sub_legacy_expanded',
    },
    {
      lines: [
        { parent: null, subscription: null },
        {
          parent: {
            invoice_item_details: null,
            subscription_item_details: { subscription: 'sub_item_parent' },
            type: 'subscription_item_details',
          },
          subscription: null,
        },
      ],
      stripeSubscriptionId: 'sub_item_parent',
    },
    {
      lines: [
        { parent: null, subscription: null },
        {
          parent: {
            invoice_item_details: { subscription: 'sub_invoice_item_parent' },
            subscription_item_details: null,
            type: 'invoice_item_details',
          },
          subscription: null,
        },
      ],
      stripeSubscriptionId: 'sub_invoice_item_parent',
    },
  ])(
    'falls back across all invoice lines to $stripeSubscriptionId',
    ({ lines, stripeSubscriptionId }) => {
      const fact = extractBillingFacts(
        createEvent(
          'invoice.payment_failed',
          invoice({ lines: { data: lines }, parent: null, payments: undefined }),
        ),
      )

      expect(fact).toMatchObject({ stripeSubscriptionId })
    },
  )

  it('keeps an invoice fact when subscription linkage is unresolved', () => {
    const fact = extractBillingFacts(
      createEvent(
        'invoice.payment_failed',
        invoice({ lines: { data: [] }, parent: null, payments: undefined }),
      ),
    )

    expect(fact).toMatchObject({ stripeInvoiceId: 'in_paid', stripeSubscriptionId: null })
  })

  it.each([
    undefined,
    { data: [], has_more: false },
    { data: [], has_more: true },
    {
      data: [
        {
          amount_paid: null,
          currency: 'usd',
          id: 'inpay_incomplete',
          payment: { payment_intent: 'pi_incomplete', type: 'payment_intent' },
          status: 'open',
          status_transitions: { paid_at: null },
        },
      ],
      has_more: false,
    },
  ])('marks absent or incomplete embedded payment evidence unavailable', (payments) => {
    const fact = extractBillingFacts(createEvent('invoice.payment_failed', invoice({ payments })))

    expect(fact).toMatchObject({ invoicePayments: [], paymentEvidence: 'unavailable' })
  })

  it('rejects an invoice event without an invoice ID', () => {
    expect(() =>
      extractBillingFacts(createEvent('invoice.payment_failed', invoice({ id: undefined }))),
    ).toThrow('missing an invoice ID')
  })

  it.each(['active', 'past_due', 'unpaid', 'incomplete_expired', 'canceled'])(
    'preserves the raw subscription status %s',
    (status) => {
      const fact = extractBillingFacts(
        createEvent(
          'customer.subscription.updated',
          subscription({
            cancel_at_period_end: status === 'canceled',
            canceled_at: status === 'canceled' ? 1_750_000_500 : null,
            cancellation_details: status === 'canceled' ? { reason: 'payment_failed' } : null,
            ended_at: status === 'canceled' ? 1_750_000_600 : null,
            status,
            trial_end: 1_760_000_000,
            trial_start: 1_750_000_000,
          }),
        ),
      )

      expect(fact).toStrictEqual({
        cancelAtPeriodEnd: status === 'canceled',
        canceledAt: status === 'canceled' ? 1_750_000_500 : null,
        cancellationReason: status === 'canceled' ? 'payment_failed' : null,
        currentPeriodEnd: 1_810_000_000,
        endedAt: status === 'canceled' ? 1_750_000_600 : null,
        kind: 'subscription',
        livemode: true,
        occurredAt: 1_750_000_000,
        status,
        stripeCustomerId: 'cus_subscription',
        stripeSubscriptionId: 'sub_fact',
        trialEnd: 1_760_000_000,
        trialStart: 1_750_000_000,
        version: 1,
      })
    },
  )

  it('uses null when a subscription has no item period end', () => {
    const fact = extractBillingFacts(
      createEvent('customer.subscription.created', subscription({ items: { data: [] } })),
    )

    expect(fact).toMatchObject({ currentPeriodEnd: null })
  })

  it.each(['checkout.session.completed', 'charge.succeeded', 'customer.deleted'])(
    'returns no fact for %s',
    (eventType) => {
      expect(
        extractBillingFacts(createEvent(eventType, { id: 'object_non_billing' })),
      ).toBeUndefined()
    },
  )
})
