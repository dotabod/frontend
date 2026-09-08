import type Stripe from 'stripe'

interface CommonBillingFacts {
  readonly livemode: boolean
  readonly occurredAt: number
  readonly stripeCustomerId: string | null
  readonly version: 1
}

interface InvoicePaymentFact {
  readonly amountPaidMinor: number
  readonly currency: string
  readonly paidAt: number
  readonly paymentObjectId: string
  readonly paymentObjectType: Stripe.InvoicePayment.Payment.Type
  readonly status: string
  readonly stripeInvoicePaymentId: string
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

type InvoiceBillingEvent =
  | Stripe.InvoiceMarkedUncollectibleEvent
  | Stripe.InvoiceOverdueEvent
  | Stripe.InvoicePaidEvent
  | Stripe.InvoicePaymentFailedEvent
  | Stripe.InvoicePaymentSucceededEvent
  | Stripe.InvoiceVoidedEvent

type SubscriptionBillingEvent =
  | Stripe.CustomerSubscriptionCreatedEvent
  | Stripe.CustomerSubscriptionDeletedEvent
  | Stripe.CustomerSubscriptionUpdatedEvent

const invoiceBillingEventTypes = new Set<Stripe.Event.Type>([
  'invoice.marked_uncollectible',
  'invoice.overdue',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
  'invoice.voided',
])

const subscriptionBillingEventTypes = new Set<Stripe.Event.Type>([
  'customer.subscription.created',
  'customer.subscription.deleted',
  'customer.subscription.updated',
])

const normalizeStripeId = function normalizeStripeId(reference: StripeIdReference): string | null {
  if (reference instanceof Object) {
    return reference.id
  }

  return reference ?? null
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
  const { payments } = invoice
  if (payments === undefined || payments.has_more || payments.data.length === 0) {
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
      invoicePayment.status === ''
    ) {
      return { invoicePayments: [], paymentEvidence: 'unavailable' }
    }

    if (invoicePayment.amount_paid === null || invoicePayment.currency === '' || paidAt === null) {
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
  const periodEnds = subscription.items.has_more
    ? []
    : subscription.items.data.map((item) => item.current_period_end)

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

const isInvoiceBillingEvent = function isInvoiceBillingEvent(
  event: Stripe.Event,
): event is InvoiceBillingEvent {
  return invoiceBillingEventTypes.has(event.type)
}

const isSubscriptionBillingEvent = function isSubscriptionBillingEvent(
  event: Stripe.Event,
): event is SubscriptionBillingEvent {
  return subscriptionBillingEventTypes.has(event.type)
}

export const extractBillingFacts = function extractBillingFacts(
  event: Stripe.Event,
): BillingFacts | undefined {
  if (isInvoiceBillingEvent(event)) {
    return extractInvoiceBillingFacts(event, event.data.object)
  }

  if (isSubscriptionBillingEvent(event)) {
    return extractSubscriptionBillingFacts(event, event.data.object)
  }

  return undefined
}
