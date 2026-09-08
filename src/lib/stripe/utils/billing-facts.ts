import type Stripe from 'stripe'

type CommonBillingFacts = {
  livemode: boolean
  occurredAt: number
  stripeCustomerId: string | null
  version: 1
}

type InvoicePaymentFact = {
  amountPaidMinor: number
  currency: string
  paidAt: number
  paymentObjectId: string
  paymentObjectType: Stripe.InvoicePayment.Payment.Type
  status: string
  stripeInvoicePaymentId: string
}

export type InvoiceBillingFacts = CommonBillingFacts & {
  amountDueMinor: number
  amountPaidMinor: number
  amountRemainingMinor: number
  attemptCount: number
  billingReason: Stripe.Invoice.BillingReason | null
  collectionMethod: Stripe.Invoice.CollectionMethod
  currency: string
  invoicePayments: InvoicePaymentFact[]
  kind: 'invoice'
  markedUncollectibleAt: number | null
  paidAt: number | null
  paymentEvidence: 'available' | 'unavailable'
  status: Stripe.Invoice.Status | null
  stripeInvoiceId: string
  stripeSubscriptionId: string | null
  voidedAt: number | null
}

export type SubscriptionBillingFacts = CommonBillingFacts & {
  cancelAtPeriodEnd: boolean
  canceledAt: number | null
  cancellationReason: Stripe.Subscription.CancellationDetails.Reason | null
  currentPeriodEnd: number | null
  endedAt: number | null
  kind: 'subscription'
  status: Stripe.Subscription.Status
  stripeSubscriptionId: string
  trialEnd: number | null
  trialStart: number | null
}

export type BillingFacts = InvoiceBillingFacts | SubscriptionBillingFacts

type StripeIdReference = string | { id: string } | null | undefined

const normalizeStripeId = function normalizeStripeId(reference: StripeIdReference): string | null {
  if (typeof reference === 'string') {
    return reference
  }

  return reference?.id ?? null
}

const isPresentStripeId = function isPresentStripeId(
  value: string | null | undefined,
): value is string {
  return value !== null && value !== undefined && value !== ''
}

const findInvoiceSubscriptionId = function findInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): string | null {
  if (invoice.parent?.type === 'subscription_details') {
    const parentSubscriptionId = normalizeStripeId(
      invoice.parent.subscription_details?.subscription,
    )

    if (isPresentStripeId(parentSubscriptionId)) {
      return parentSubscriptionId
    }
  }

  for (const line of invoice.lines.data) {
    const legacySubscriptionId = normalizeStripeId(line.subscription)
    if (isPresentStripeId(legacySubscriptionId)) {
      return legacySubscriptionId
    }

    if (line.parent?.type === 'subscription_item_details') {
      const subscriptionId = line.parent.subscription_item_details?.subscription
      if (isPresentStripeId(subscriptionId)) {
        return subscriptionId
      }
    }

    if (line.parent?.type === 'invoice_item_details') {
      const subscriptionId = line.parent.invoice_item_details?.subscription
      if (isPresentStripeId(subscriptionId)) {
        return subscriptionId
      }
    }
  }

  return null
}

const extractInvoicePayments = function extractInvoicePayments(
  invoice: Stripe.Invoice,
): Pick<InvoiceBillingFacts, 'invoicePayments' | 'paymentEvidence'> {
  const payments = invoice.payments
  if (payments === undefined || payments.has_more !== false || payments.data.length === 0) {
    return { invoicePayments: [], paymentEvidence: 'unavailable' }
  }

  const invoicePayments: InvoicePaymentFact[] = []

  for (const invoicePayment of payments.data) {
    const paymentObjectId =
      invoicePayment.payment.type === 'charge'
        ? normalizeStripeId(invoicePayment.payment.charge)
        : normalizeStripeId(invoicePayment.payment.payment_intent)
    const paidAt = invoicePayment.status_transitions.paid_at

    if (
      invoicePayment.id === '' ||
      !isPresentStripeId(paymentObjectId) ||
      invoicePayment.status === '' ||
      invoicePayment.amount_paid === null ||
      invoicePayment.currency === '' ||
      paidAt === null
    ) {
      return { invoicePayments: [], paymentEvidence: 'unavailable' }
    }

    invoicePayments.push({
      amountPaidMinor: invoicePayment.amount_paid,
      currency: invoicePayment.currency,
      paidAt,
      paymentObjectId,
      paymentObjectType: invoicePayment.payment.type,
      status: invoicePayment.status,
      stripeInvoicePaymentId: invoicePayment.id,
    })
  }

  return { invoicePayments, paymentEvidence: 'available' }
}

const extractInvoiceBillingFacts = function extractInvoiceBillingFacts(
  event: Stripe.Event,
  invoice: Stripe.Invoice,
): InvoiceBillingFacts {
  if (!isPresentStripeId(invoice.id)) {
    throw new Error(`Stripe invoice event ${event.id} is missing an invoice ID`)
  }

  return {
    amountDueMinor: invoice.amount_due,
    amountPaidMinor: invoice.amount_paid,
    amountRemainingMinor: invoice.amount_remaining,
    attemptCount: invoice.attempt_count,
    billingReason: invoice.billing_reason,
    collectionMethod: invoice.collection_method,
    currency: invoice.currency,
    ...extractInvoicePayments(invoice),
    kind: 'invoice',
    livemode: event.livemode,
    markedUncollectibleAt: invoice.status_transitions.marked_uncollectible_at,
    occurredAt: event.created,
    paidAt: invoice.status_transitions.paid_at,
    status: invoice.status,
    stripeCustomerId: normalizeStripeId(invoice.customer),
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId: findInvoiceSubscriptionId(invoice),
    version: 1,
    voidedAt: invoice.status_transitions.voided_at,
  }
}

const extractSubscriptionBillingFacts = function extractSubscriptionBillingFacts(
  event: Stripe.Event,
  subscription: Stripe.Subscription,
): SubscriptionBillingFacts {
  const periodEnds =
    subscription.items.has_more === false
      ? subscription.items.data.map((item) => item.current_period_end)
      : []

  return {
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at,
    cancellationReason: subscription.cancellation_details?.reason ?? null,
    currentPeriodEnd: periodEnds.length === 0 ? null : Math.max(...periodEnds),
    endedAt: subscription.ended_at,
    kind: 'subscription',
    livemode: event.livemode,
    occurredAt: event.created,
    status: subscription.status,
    stripeCustomerId: normalizeStripeId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    trialEnd: subscription.trial_end,
    trialStart: subscription.trial_start,
    version: 1,
  }
}

export const extractBillingFacts = function extractBillingFacts(
  event: Stripe.Event,
): BillingFacts | undefined {
  switch (event.type) {
    case 'invoice.marked_uncollectible':
    case 'invoice.overdue':
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.payment_succeeded':
    case 'invoice.voided': {
      return extractInvoiceBillingFacts(event, event.data.object)
    }
    case 'customer.subscription.created':
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      return extractSubscriptionBillingFacts(event, event.data.object)
    }
    default: {
      return undefined
    }
  }
}
