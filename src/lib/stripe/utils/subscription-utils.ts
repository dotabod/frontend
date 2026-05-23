import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe-server'

/**
 * Verifies if a price ID represents a lifetime subscription
 * @param priceId The Stripe price ID to check
 * @returns true if the price is for a lifetime subscription, false otherwise
 */
export async function isLifetimePrice(priceId: string): Promise<boolean> {
  const { getCurrentPeriod } = await import('@/utils/subscription')
  const pricePeriod = getCurrentPeriod(priceId)

  // Add explicit logging to track price period detection
  console.log(`Checking if price ${priceId} is lifetime: detected period=${pricePeriod}`)

  // If we're not 100% sure it's a lifetime price, don't treat it as one
  if (pricePeriod === 'lifetime') {
    return true
  }

  // Extra safety check to prevent false positives
  // Always return false for non-lifetime periods to be safe
  console.log(`Price ${priceId} is not lifetime, detected as ${pricePeriod}`)
  return false
}

/**
 * Checks if a subscription already exists for a user and payment
 * @param userId The user ID
 * @param customerId The Stripe customer ID
 * @param sessionId The checkout session ID (for crypto payments)
 * @param tx The Prisma transaction client
 * @returns The existing subscription if found, null otherwise
 */
export async function findExistingCryptoSubscription(
  userId: string,
  customerId: string,
  sessionId: string,
  tx: Prisma.TransactionClient,
) {
  return await tx.subscription.findFirst({
    where: {
      OR: [
        // Check for recurring subscriptions
        {
          metadata: {
            equals: 'true',
            path: ['isCryptoPayment'],
          },
          stripeCustomerId: customerId,
          transactionType: 'RECURRING',
        },
        // Also check for one-time crypto payments with our special ID format
        {
          stripeSubscriptionId: `crypto_${sessionId}`,
        },
      ],
      userId,
    },
  })
}

/**
 * Creates a lifetime purchase record
 * @param userId The user ID
 * @param customerId The Stripe customer ID
 * @param priceId The Stripe price ID
 * @param tx The transaction client
 * @returns The created subscription
 */
export async function createLifetimePurchase(
  userId: string,
  customerId: string,
  priceId: string | null,
  tx: Prisma.TransactionClient,
  metadata?: Prisma.InputJsonObject,
): Promise<{ id: string }> {
  const existingLifetimePurchase = await tx.subscription.findFirst({
    select: {
      id: true,
    },
    where: {
      status: SubscriptionStatus.ACTIVE,
      transactionType: TransactionType.LIFETIME,
      userId,
    },
  })

  if (existingLifetimePurchase) {
    console.log(
      `Skipping duplicate lifetime purchase for user ${userId}; active lifetime subscription ${existingLifetimePurchase.id} already exists`,
    )
    return existingLifetimePurchase
  }

  // Lifetime subscriptions don't expire for 100 years
  const farFutureDate = new Date()
  farFutureDate.setFullYear(farFutureDate.getFullYear() + 100)

  console.log(
    `Creating lifetime purchase for user ${userId} with price ID ${priceId} in createLifetimePurchase`,
  )

  return await tx.subscription.create({
    data: {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: farFutureDate,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: customerId,
      stripePriceId: priceId || undefined,
      tier: 'PRO',
      transactionType: TransactionType.LIFETIME,
      userId,
      ...(metadata ? { metadata } : {}),
    },
    select: {
      id: true,
    },
  })
}

/**
 * Creates a crypto subscription with renewal invoice
 * @param userId The user ID
 * @param session The Stripe checkout session
 * @param priceId The Stripe price ID
 * @param customerId The Stripe customer ID
 * @param tx The transaction client
 * @param startFromDate Optional start date for upgrades
 * @returns true if successful, false otherwise
 */
export async function createCryptoSubscription(
  userId: string,
  session: Stripe.Checkout.Session,
  priceId: string,
  customerId: string,
  tx: Prisma.TransactionClient,
  startFromDate?: Date,
): Promise<boolean> {
  // Import the crypto price period determination function
  const { getCurrentPeriod } = await import('@/utils/subscription')
  const pricePeriod = getCurrentPeriod(priceId)

  console.log(`Creating crypto subscription for price ${priceId} with period ${pricePeriod}`)

  // Check if this is a lifetime payment
  if (pricePeriod === 'lifetime') {
    console.log(`Detected lifetime crypto payment for price ${priceId}`)
    await createLifetimePurchase(userId, customerId, priceId, tx)
    return true
  }

  // Calculate the period end date based on the price period
  const isAnnual = pricePeriod === 'annual'
  // Use startFromDate if provided (for upgrades) or current date for new subscriptions
  const startDate = startFromDate || new Date()
  const periodEnd = new Date(startDate)

  if (isAnnual) {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    // Monthly
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  // Log special message if this is an upgrade
  if (startFromDate) {
    console.log(
      `Upgrade detected: Creating new ${pricePeriod} subscription starting from ${startFromDate.toISOString()}, ending on ${periodEnd.toISOString()}`,
    )
  }

  // Create a draft invoice for future payment (to be sent at the end of the period)
  // We're creating this upfront so we can reference it in our DB record
  const renewalDate = new Date(periodEnd)
  // Set the invoice date to 7 days before the period ends
  renewalDate.setDate(renewalDate.getDate() - 7)

  try {
    // For crypto payments, we create a draft invoice instead of a subscription
    // Since crypto payments are one-time and not recurring
    const invoice = await stripe.invoices.create({
      auto_advance: true, // Enable automatic advancement so Stripe handles finalization
      automatically_finalizes_at: Math.floor(renewalDate.getTime() / 1000),
      collection_method: 'send_invoice',
      customer: customerId,
      description: `Crypto Dotabod Pro ${pricePeriod.charAt(0).toUpperCase() + pricePeriod.slice(1)} subscription`,
      due_date: Math.floor((renewalDate.getTime() + 7 * 24 * 60 * 60 * 1000) / 1000), // Due date 7 days after finalization date
      metadata: {
        isCryptoPayment: 'true',
        isRenewalInvoice: 'true',
        originalCheckoutSession: session.id,
        pricePeriod,
        userId,
      },
    })

    // Fetch the price details from Stripe
    const price = await stripe.prices.retrieve(priceId)
    if (!price.unit_amount) {
      throw new Error('Price unit amount is not set')
    }

    // Add the line item for the price
    await stripe.invoiceItems.create({
      amount: price.unit_amount,
      customer: customerId,
      description: `Crypto Dotabod Pro ${pricePeriod.charAt(0).toUpperCase() + pricePeriod.slice(1)} subscription`,
      invoice: invoice.id,
    })

    console.log(
      `Created renewal draft invoice ${invoice.id} for crypto payment to be sent on ${renewalDate.toISOString()}`,
    )

    // Store the invoice ID for reference
    const renewalInvoiceId = invoice.id

    // Create a subscription record with auto-expiry at period end
    await tx.subscription.create({
      data: {
        cancelAtPeriodEnd: true, // Will expire at the end of the period
        currentPeriodEnd: periodEnd,
        metadata: {
          checkoutSessionId: session.id,
          isCryptoPayment: 'true',
          paymentIntentId: (session.payment_intent as string) || undefined,
          priceType: pricePeriod,
          renewalDueDate: renewalDate.toISOString(),
          renewalInvoiceId, // Store reference to the draft invoice,
        },
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: customerId,
        stripePriceId: priceId,
        stripeSubscriptionId: `crypto_${session.id}`, // Use a prefix to identify crypto payments
        tier: 'PRO',
        transactionType: TransactionType.RECURRING,
        userId,
      },
    })

    console.log(
      `Created crypto subscription (${pricePeriod}) ending on ${periodEnd.toISOString()} with renewal invoice to be sent ${renewalDate.toISOString()}`,
    )
    return true
  } catch (error) {
    console.error('Failed to set up crypto payment renewal:', error)

    // Still create the subscription but without renewal info
    await tx.subscription.create({
      data: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: periodEnd,
        metadata: {
          checkoutSessionId: session.id,
          isCryptoPayment: 'true',
          paymentIntentId: (session.payment_intent as string) || undefined,
          priceType: pricePeriod,
          renewalError: 'true',
        },
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: customerId,
        stripePriceId: priceId,
        stripeSubscriptionId: `crypto_${session.id}`,
        tier: 'PRO',
        transactionType: TransactionType.RECURRING,
        userId,
      },
    })

    console.log(
      `Created crypto subscription (${pricePeriod}) ending on ${periodEnd.toISOString()} (without renewal due to error)`,
    )
    return true
  }
}
