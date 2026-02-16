#!/usr/bin/env bun

/**
 * Recovery script for failed OpenNode crypto payments
 *
 * This script manually completes the payment processing for OpenNode charges
 * that were marked as 'paid' but failed to create a subscription due to
 * errors in the webhook handler.
 *
 * Usage:
 *   doppler run -- bun run scripts/fix-opennode-payment.ts                      # Auto-discover and fix interactively
 *   doppler run -- bun run scripts/fix-opennode-payment.ts <invoice_id>         # Fix specific invoice
 *   doppler run -- bun run scripts/fix-opennode-payment.ts --charge-id <id>     # Fix specific charge
 *   doppler run -- bun run scripts/fix-opennode-payment.ts --dry-run            # Show what would be fixed
 */

import * as readline from 'node:readline'
import type { OpenNodeCharge } from '@prisma/client'
import { PrismaClient, SubscriptionStatus, TransactionType } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { handleInvoiceEvent } from '@/pages/api/stripe/handlers/invoice-events'

// Parse command line arguments
const args = process.argv.slice(2)
let invoiceId: string | null = null
let chargeId: string | null = null
let dryRun = false

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--charge-id' && args[i + 1]) {
    chargeId = args[i + 1]
    i++
  } else if (args[i] === '--dry-run') {
    dryRun = true
  } else if (!args[i].startsWith('--')) {
    invoiceId = args[i]
  }
}

const prisma = new PrismaClient()

interface ChargeToFix {
  charge: OpenNodeCharge
  hasLifetimeSubscription: boolean
  reason: string
}

interface FixResult {
  charge: OpenNodeCharge
  success: boolean
  skipped: boolean
  error?: string
  subscriptionId?: string
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase().trim())
    })
  })
}

async function discoverChargesToFix(): Promise<ChargeToFix[]> {
  // Find all paid/confirmed charges
  const paidCharges = await prisma.openNodeCharge.findMany({
    where: { status: { in: ['paid', 'confirmed'] } },
    orderBy: { createdAt: 'desc' },
  })

  const results: ChargeToFix[] = []

  for (const charge of paidCharges) {
    // Check if user has active LIFETIME subscription
    const lifetimeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: charge.userId,
        transactionType: TransactionType.LIFETIME,
        status: SubscriptionStatus.ACTIVE,
      },
    })

    const hasLifetime = !!lifetimeSubscription
    const missingWebhook = !charge.lastWebhookAt
    const needsFix = !hasLifetime || missingWebhook

    if (needsFix) {
      let reason = ''
      if (!hasLifetime && missingWebhook) {
        reason = 'No subscription + webhook never processed'
      } else if (!hasLifetime) {
        reason = 'No active LIFETIME subscription'
      } else if (missingWebhook) {
        reason = 'Webhook never processed (subscription exists)'
      }

      results.push({
        charge,
        hasLifetimeSubscription: hasLifetime,
        reason,
      })
    }
  }

  return results
}

async function fixSingleCharge(charge: OpenNodeCharge): Promise<FixResult> {
  const result: FixResult = {
    charge,
    success: false,
    skipped: false,
  }

  try {
    // Step 1: Validate charge status
    if (charge.status !== 'paid' && charge.status !== 'confirmed') {
      result.error = `Charge status is '${charge.status}', expected 'paid' or 'confirmed'`
      return result
    }

    // Step 2: Check for existing lifetime subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: charge.userId,
        transactionType: TransactionType.LIFETIME,
        status: SubscriptionStatus.ACTIVE,
      },
    })

    if (existingSubscription) {
      // Update lastWebhookAt if it's NULL
      if (!charge.lastWebhookAt) {
        await prisma.openNodeCharge.update({
          where: { openNodeChargeId: charge.openNodeChargeId },
          data: {
            lastWebhookAt: new Date(),
            metadata: {
              ...((charge.metadata as Record<string, unknown>) || {}),
              recoveryScriptRan: true,
              recoveryScriptRunAt: new Date().toISOString(),
              recoveryNote: 'Subscription already existed, just updated lastWebhookAt',
            },
          },
        })
      }
      result.success = true
      result.subscriptionId = existingSubscription.id
      return result
    }

    // Step 3: Retrieve and validate Stripe invoice
    const invoice = await stripe.invoices.retrieve(charge.stripeInvoiceId)

    if (!invoice.metadata?.userId) {
      result.error = 'Invoice is missing userId in metadata'
      return result
    }
    if (!invoice.metadata?.stripePriceId) {
      result.error = 'Invoice is missing stripePriceId in metadata'
      return result
    }

    // Step 4: Mark Stripe invoice as paid
    if (!invoice.id) {
      result.error = 'Invoice is missing id'
      return result
    }
    const invoiceId = invoice.id
    if (invoice.status !== 'paid') {
      try {
        await stripe.invoices.pay(
          invoiceId,
          { paid_out_of_band: true },
          { idempotencyKey: charge.openNodeChargeId },
        )
      } catch (error: any) {
        if (error.code !== 'invoice_already_paid') {
          throw error
        }
      }
    }

    // Step 5: Process the invoice event (creates subscription)
    const processResult = await prisma.$transaction(async (tx) => {
      const updatedInvoice = await stripe.invoices.retrieve(invoiceId)
      return await handleInvoiceEvent(updatedInvoice, tx)
    })

    if (!processResult) {
      result.error = 'Failed to create subscription via handleInvoiceEvent'
      return result
    }

    // Step 6: Verify subscription was created
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: charge.userId,
        transactionType: TransactionType.LIFETIME,
        status: SubscriptionStatus.ACTIVE,
      },
    })

    if (!subscription) {
      result.error = 'Subscription was not created after processing'
      return result
    }

    // Step 7: Update OpenNode charge record
    await prisma.openNodeCharge.update({
      where: { openNodeChargeId: charge.openNodeChargeId },
      data: {
        lastWebhookAt: new Date(),
        metadata: {
          ...((charge.metadata as Record<string, unknown>) || {}),
          recoveryScriptRan: true,
          recoveryScriptRunAt: new Date().toISOString(),
          subscriptionId: subscription.id,
          processedSuccessfully: true,
        },
      },
    })

    result.success = true
    result.subscriptionId = subscription.id
    return result
  } catch (error: any) {
    result.error = error.message || 'Unknown error'
    return result
  }
}

async function runDiscoveryMode(): Promise<void> {
  console.log('='.repeat(80))
  console.log('OpenNode Payment Recovery - Discovery Mode')
  console.log('='.repeat(80))
  console.log()

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
    console.log()
  }

  console.log('Scanning for charges that need fixing...')
  console.log()

  const chargesToFix = await discoverChargesToFix()

  if (chargesToFix.length === 0) {
    console.log('✅ No charges need fixing!')
    console.log()
    return
  }

  console.log(`Found ${chargesToFix.length} charge(s) that need attention:`)
  console.log()

  for (let i = 0; i < chargesToFix.length; i++) {
    const { charge, reason } = chargesToFix[i]
    console.log(`${i + 1}. ${charge.openNodeChargeId}`)
    console.log(`   Invoice: ${charge.stripeInvoiceId}`)
    console.log(`   User: ${charge.userId}`)
    console.log(`   Amount: ${charge.amount} ${charge.currency.toUpperCase()}`)
    console.log(`   Issue: ${reason}`)
    console.log()
  }

  if (dryRun) {
    console.log('='.repeat(80))
    console.log('DRY RUN COMPLETE')
    console.log('='.repeat(80))
    console.log()
    console.log('To fix these charges, run without --dry-run:')
    console.log('  doppler run -- bun run scripts/fix-opennode-payment.ts')
    console.log()
    return
  }

  console.log('='.repeat(80))
  console.log('Interactive Fix Mode')
  console.log('='.repeat(80))
  console.log()
  console.log('For each charge, enter:')
  console.log('  y = fix this charge')
  console.log('  n = skip this charge')
  console.log('  q = quit (stop processing)')
  console.log()

  const results: FixResult[] = []

  for (let i = 0; i < chargesToFix.length; i++) {
    const { charge, reason } = chargesToFix[i]

    console.log('-'.repeat(80))
    console.log(`Charge ${i + 1}/${chargesToFix.length}: ${charge.openNodeChargeId}`)
    console.log(`  Invoice: ${charge.stripeInvoiceId}`)
    console.log(`  User: ${charge.userId}`)
    console.log(`  Amount: ${charge.amount} ${charge.currency.toUpperCase()}`)
    console.log(`  Issue: ${reason}`)
    console.log()

    const answer = await prompt('Fix this charge? (y/n/q): ')

    if (answer === 'q') {
      console.log()
      console.log('Quitting...')
      break
    }

    if (answer !== 'y') {
      console.log('Skipped')
      results.push({ charge, success: false, skipped: true })
      console.log()
      continue
    }

    console.log('Processing...')
    const result = await fixSingleCharge(charge)
    results.push(result)

    if (result.success) {
      console.log(`✅ Fixed! Subscription ID: ${result.subscriptionId}`)
    } else {
      console.log(`❌ Failed: ${result.error}`)
    }
    console.log()
  }

  // Summary
  console.log('='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log()

  const fixed = results.filter((r) => r.success)
  const skipped = results.filter((r) => r.skipped)
  const failed = results.filter((r) => !r.success && !r.skipped)

  console.log(`Total processed: ${results.length}/${chargesToFix.length}`)
  console.log(`  ✅ Fixed: ${fixed.length}`)
  console.log(`  ⏭️  Skipped: ${skipped.length}`)
  console.log(`  ❌ Failed: ${failed.length}`)
  console.log()

  if (failed.length > 0) {
    console.log('Failed charges:')
    for (const result of failed) {
      console.log(`  • ${result.charge.openNodeChargeId}: ${result.error}`)
    }
    console.log()
  }
}

async function runSingleChargeMode(): Promise<void> {
  console.log('='.repeat(80))
  console.log('OpenNode Payment Recovery Script')
  console.log('='.repeat(80))

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
    console.log()
  }

  // Step 1: Find the OpenNode charge
  console.log('Step 1: Finding OpenNode charge...')
  let charge

  if (chargeId) {
    charge = await prisma.openNodeCharge.findUnique({
      where: { openNodeChargeId: chargeId },
    })
    if (charge) {
      invoiceId = charge.stripeInvoiceId
    }
  } else if (invoiceId) {
    charge = await prisma.openNodeCharge.findUnique({
      where: { stripeInvoiceId: invoiceId },
    })
    if (charge) {
      chargeId = charge.openNodeChargeId
    }
  }

  if (!charge) {
    console.error('❌ OpenNode charge not found')
    if (chargeId) {
      console.error(`   Charge ID: ${chargeId}`)
    }
    if (invoiceId) {
      console.error(`   Invoice ID: ${invoiceId}`)
    }
    process.exit(1)
  }

  console.log('✅ OpenNode charge found')
  console.log(`   Charge ID: ${charge.openNodeChargeId}`)
  console.log(`   Invoice ID: ${charge.stripeInvoiceId}`)
  console.log(`   User ID: ${charge.userId}`)
  console.log(`   Status: ${charge.status}`)
  console.log(`   Amount: ${charge.amount} ${charge.currency.toUpperCase()}`)
  console.log(`   Last Webhook At: ${charge.lastWebhookAt || 'NULL'}`)
  console.log()

  // Step 2: Validate charge status
  console.log('Step 2: Validating charge status...')
  if (charge.status !== 'paid' && charge.status !== 'confirmed') {
    console.error(`❌ Charge status is '${charge.status}', expected 'paid' or 'confirmed'`)
    console.error('   Cannot process payment that has not been confirmed by OpenNode')
    process.exit(1)
  }
  console.log(`✅ Charge status is '${charge.status}'`)
  console.log()

  // Step 3: Check for existing lifetime subscription
  console.log('Step 3: Checking for existing subscription...')
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      userId: charge.userId,
      transactionType: TransactionType.LIFETIME,
      status: SubscriptionStatus.ACTIVE,
    },
  })

  if (existingSubscription) {
    console.log('⚠️  User already has an active lifetime subscription')
    console.log(`   Subscription ID: ${existingSubscription.id}`)
    console.log(`   Created At: ${existingSubscription.createdAt}`)
    console.log(`   Period End: ${existingSubscription.currentPeriodEnd}`)
    console.log()
    console.log('✅ Payment has already been processed successfully')

    // Update lastWebhookAt if it's NULL
    if (!charge.lastWebhookAt && !dryRun) {
      console.log('Updating OpenNode charge lastWebhookAt...')
      await prisma.openNodeCharge.update({
        where: { openNodeChargeId: charge.openNodeChargeId },
        data: {
          lastWebhookAt: new Date(),
          metadata: {
            ...((charge.metadata as Record<string, unknown>) || {}),
            recoveryScriptRan: true,
            recoveryScriptRunAt: new Date().toISOString(),
            recoveryNote: 'Subscription already existed, just updated lastWebhookAt',
          },
        },
      })
      console.log('✅ Updated OpenNode charge record')
    }

    process.exit(0)
  }
  console.log('✅ No existing lifetime subscription found')
  console.log()

  // Step 4: Retrieve Stripe invoice
  console.log('Step 4: Retrieving Stripe invoice...')
  const invoice = await stripe.invoices.retrieve(charge.stripeInvoiceId)

  console.log('✅ Stripe invoice retrieved')
  console.log(`   Invoice ID: ${invoice.id}`)
  console.log(`   Status: ${invoice.status}`)
  console.log(`   Customer ID: ${invoice.customer}`)
  console.log('   Metadata:')
  console.log(`     - userId: ${invoice.metadata?.userId || 'N/A'}`)
  console.log(`     - stripePriceId: ${invoice.metadata?.stripePriceId || 'N/A'}`)
  console.log(`     - paymentProvider: ${invoice.metadata?.paymentProvider || 'N/A'}`)
  console.log(`     - isCryptoPayment: ${invoice.metadata?.isCryptoPayment || 'N/A'}`)
  console.log()

  // Step 5: Validate invoice metadata
  console.log('Step 5: Validating invoice metadata...')
  if (!invoice.metadata?.userId) {
    console.error('❌ Invoice is missing userId in metadata')
    process.exit(1)
  }
  if (!invoice.metadata?.stripePriceId) {
    console.error('❌ Invoice is missing stripePriceId in metadata')
    process.exit(1)
  }
  if (invoice.metadata?.paymentProvider !== 'opennode') {
    console.warn(
      `⚠️  Invoice paymentProvider is '${invoice.metadata?.paymentProvider}', expected 'opennode'`,
    )
  }
  console.log('✅ Invoice metadata is valid')
  console.log()

  if (dryRun) {
    console.log('='.repeat(80))
    console.log('DRY RUN COMPLETE')
    console.log('='.repeat(80))
    console.log('✅ All validations passed')
    console.log()
    console.log('Next steps if run without --dry-run:')
    console.log('  1. Mark Stripe invoice as paid (out-of-band)')
    console.log('  2. Process invoice.paid event via handleInvoiceEvent()')
    console.log('  3. Create lifetime subscription in database')
    console.log('  4. Update OpenNode charge lastWebhookAt')
    console.log('  5. Verify subscription was created')
    console.log()
    process.exit(0)
  }

  // Step 6: Mark Stripe invoice as paid
  console.log('Step 6: Marking Stripe invoice as paid...')
  if (!invoice.id) {
    console.error('❌ Invoice is missing id')
    process.exit(1)
  }
  const singleInvoiceId = invoice.id
  if (invoice.status === 'paid') {
    console.log('⚠️  Invoice is already marked as paid in Stripe')
  } else {
    try {
      await stripe.invoices.pay(
        singleInvoiceId,
        { paid_out_of_band: true },
        { idempotencyKey: charge.openNodeChargeId },
      )
      console.log('✅ Marked Stripe invoice as paid (out-of-band)')
    } catch (error: any) {
      if (error.code === 'invoice_already_paid') {
        console.log('⚠️  Invoice is already paid (Stripe API confirmed)')
      } else {
        throw error
      }
    }
  }
  console.log()

  // Step 7: Process the invoice event (creates subscription)
  console.log('Step 7: Processing invoice.paid event...')
  console.log('Creating subscription via handleInvoiceEvent...')

  const result = await prisma.$transaction(async (tx) => {
    // Re-fetch invoice to get the latest status
    const updatedInvoice = await stripe.invoices.retrieve(singleInvoiceId)
    const success = await handleInvoiceEvent(updatedInvoice, tx)
    return success
  })

  if (!result) {
    console.error('❌ Failed to create subscription via handleInvoiceEvent')
    console.error('   Check the logs above for error details')
    process.exit(1)
  }
  console.log('✅ Successfully processed invoice event')
  console.log()

  // Step 8: Verify subscription was created
  console.log('Step 8: Verifying subscription creation...')
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: charge.userId,
      transactionType: TransactionType.LIFETIME,
      status: SubscriptionStatus.ACTIVE,
    },
  })

  if (!subscription) {
    console.error('❌ Subscription was not created')
    console.error('   Expected to find a LIFETIME subscription but none exists')
    process.exit(1)
  }

  console.log('✅ Subscription created successfully')
  console.log(`   Subscription ID: ${subscription.id}`)
  console.log(`   User ID: ${subscription.userId}`)
  console.log(`   Transaction Type: ${subscription.transactionType}`)
  console.log(`   Status: ${subscription.status}`)
  console.log(`   Tier: ${subscription.tier}`)
  console.log(`   Current Period End: ${subscription.currentPeriodEnd}`)
  console.log()

  // Step 9: Update OpenNode charge record
  console.log('Step 9: Updating OpenNode charge record...')
  await prisma.openNodeCharge.update({
    where: { openNodeChargeId: charge.openNodeChargeId },
    data: {
      lastWebhookAt: new Date(),
      metadata: {
        ...((charge.metadata as Record<string, unknown>) || {}),
        recoveryScriptRan: true,
        recoveryScriptRunAt: new Date().toISOString(),
        subscriptionId: subscription.id,
        processedSuccessfully: true,
      },
    },
  })
  console.log('✅ Updated OpenNode charge record with lastWebhookAt')
  console.log()

  // Final summary
  console.log('='.repeat(80))
  console.log('RECOVERY COMPLETE')
  console.log('='.repeat(80))
  console.log('✅ Payment processing completed successfully')
  console.log()
  console.log('Summary:')
  console.log(`  • OpenNode Charge ID: ${charge.openNodeChargeId}`)
  console.log(`  • Stripe Invoice ID: ${charge.stripeInvoiceId}`)
  console.log(`  • User ID: ${charge.userId}`)
  console.log(`  • Subscription ID: ${subscription.id}`)
  console.log(`  • Subscription Type: ${subscription.transactionType}`)
  console.log(`  • Subscription Status: ${subscription.status}`)
  console.log()
  console.log('The user now has access to PRO features.')
  console.log()
}

async function main() {
  try {
    // If no arguments provided, run discovery mode
    if (!invoiceId && !chargeId) {
      await runDiscoveryMode()
    } else {
      await runSingleChargeMode()
    }
  } catch (error) {
    console.error()
    console.error('='.repeat(80))
    console.error('ERROR')
    console.error('='.repeat(80))
    console.error('❌ An error occurred during recovery:')
    console.error()
    console.error(error)
    console.error()

    if (error instanceof Error) {
      console.error('Stack trace:')
      console.error(error.stack)
    }

    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
