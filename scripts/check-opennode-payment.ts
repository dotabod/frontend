#!/usr/bin/env bun

/**
 * Diagnostic script for OpenNode crypto payments
 *
 * This script checks the status of OpenNode payments without making any changes.
 * Use it to diagnose payment issues and see what needs to be done.
 *
 * Usage:
 *   doppler run -- bun run scripts/check-opennode-payment.ts                      # Auto-discover all problematic charges
 *   doppler run -- bun run scripts/check-opennode-payment.ts <invoice_id>         # Check specific invoice
 *   doppler run -- bun run scripts/check-opennode-payment.ts --charge-id <id>     # Check specific charge
 */

import type { OpenNodeCharge } from '@prisma/client'
import { PrismaClient, SubscriptionStatus, TransactionType } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'

// Parse command line arguments
const args = process.argv.slice(2)
let invoiceId: string | null = null
let chargeId: string | null = null

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--charge-id' && args[i + 1]) {
    chargeId = args[i + 1]
    i++
  } else if (!args[i].startsWith('--')) {
    invoiceId = args[i]
  }
}

const prisma = new PrismaClient()

interface ChargeWithStatus {
  charge: OpenNodeCharge
  hasLifetimeSubscription: boolean
  needsFix: boolean
  reason: string
}

async function discoverProblematicCharges(): Promise<ChargeWithStatus[]> {
  // Find all paid/confirmed charges
  const paidCharges = await prisma.openNodeCharge.findMany({
    where: { status: { in: ['paid', 'confirmed'] } },
    orderBy: { createdAt: 'desc' },
  })

  const results: ChargeWithStatus[] = []

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

    let reason = ''
    if (!hasLifetime && missingWebhook) {
      reason = 'No subscription + webhook never processed'
    } else if (!hasLifetime) {
      reason = 'No active LIFETIME subscription'
    } else if (missingWebhook) {
      reason = 'Webhook never processed (subscription exists)'
    } else {
      reason = 'OK'
    }

    results.push({
      charge,
      hasLifetimeSubscription: hasLifetime,
      needsFix,
      reason,
    })
  }

  return results
}

async function showDiscoverySummary(): Promise<void> {
  console.log('='.repeat(80))
  console.log('OpenNode Payment Discovery')
  console.log('='.repeat(80))
  console.log()
  console.log('Scanning for paid/confirmed charges that may need attention...')
  console.log()

  const allCharges = await discoverProblematicCharges()
  const chargesToFix = allCharges.filter((c) => c.needsFix)
  const okCharges = allCharges.filter((c) => !c.needsFix)

  console.log(`Found ${allCharges.length} paid/confirmed charge(s) total`)
  console.log(`  • ${chargesToFix.length} need attention`)
  console.log(`  • ${okCharges.length} are OK`)
  console.log()

  if (chargesToFix.length === 0) {
    console.log('✅ No charges need fixing!')
    console.log()
    return
  }

  console.log('='.repeat(80))
  console.log('Charges Needing Attention')
  console.log('='.repeat(80))
  console.log()

  for (let i = 0; i < chargesToFix.length; i++) {
    const { charge, hasLifetimeSubscription, reason } = chargesToFix[i]

    console.log(`${i + 1}. Charge: ${charge.openNodeChargeId}`)
    console.log(`   Invoice ID:    ${charge.stripeInvoiceId}`)
    console.log(`   User ID:       ${charge.userId}`)
    console.log(`   Amount:        ${charge.amount} ${charge.currency.toUpperCase()}`)
    console.log(`   Status:        ${charge.status}`)
    console.log(`   Created:       ${charge.createdAt.toISOString()}`)
    console.log(`   Last Webhook:  ${charge.lastWebhookAt?.toISOString() || 'NULL ⚠️'}`)
    console.log(`   Has Lifetime:  ${hasLifetimeSubscription ? 'Yes' : 'No ⚠️'}`)
    console.log(`   Issue:         ${reason}`)
    console.log()
  }

  console.log('='.repeat(80))
  console.log('Recommendations')
  console.log('='.repeat(80))
  console.log()
  console.log('To fix all charges interactively:')
  console.log('  doppler run -- bun run scripts/fix-opennode-payment.ts')
  console.log()
  console.log('To fix a specific charge:')
  console.log(
    `  doppler run -- bun run scripts/fix-opennode-payment.ts ${chargesToFix[0].charge.stripeInvoiceId}`,
  )
  console.log()
  console.log('To check a specific charge in detail:')
  console.log(
    `  doppler run -- bun run scripts/check-opennode-payment.ts ${chargesToFix[0].charge.stripeInvoiceId}`,
  )
  console.log()
}

async function checkSingleCharge(): Promise<void> {
  console.log('='.repeat(80))
  console.log('OpenNode Payment Diagnostic Check')
  console.log('='.repeat(80))
  console.log()

  // Step 1: Find the OpenNode charge
  console.log('📋 OpenNode Charge Information')
  console.log('-'.repeat(80))

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
    console.log('❌ OpenNode charge NOT FOUND in database')
    if (chargeId) {
      console.log(`   Searched for Charge ID: ${chargeId}`)
    }
    if (invoiceId) {
      console.log(`   Searched for Invoice ID: ${invoiceId}`)
    }
    console.log()
    console.log('This could mean:')
    console.log('  • The charge ID or invoice ID is incorrect')
    console.log('  • The charge was never created in our database')
    console.log('  • The charge was deleted (unlikely)')
    process.exit(1)
  }

  console.log('✅ OpenNode charge found in database')
  console.log()
  console.log(`Charge ID:        ${charge.openNodeChargeId}`)
  console.log(`Invoice ID:       ${charge.stripeInvoiceId}`)
  console.log(`User ID:          ${charge.userId}`)
  console.log(`Customer ID:      ${charge.stripeCustomerId}`)
  console.log(`Amount:           ${charge.amount} ${charge.currency.toUpperCase()}`)
  console.log(`Status:           ${charge.status}`)
  console.log(`Created At:       ${charge.createdAt}`)
  console.log(`Updated At:       ${charge.updatedAt}`)
  console.log(`Last Webhook At:  ${charge.lastWebhookAt || 'NULL ⚠️'}`)

  if (charge.metadata) {
    console.log('Metadata:')
    const metadata = charge.metadata as Record<string, unknown>
    for (const [key, value] of Object.entries(metadata)) {
      console.log('  • ' + key + ': ' + JSON.stringify(value))
    }
  }
  console.log()

  // Step 2: Check Stripe invoice
  console.log('📋 Stripe Invoice Information')
  console.log('-'.repeat(80))

  try {
    const invoice = await stripe.invoices.retrieve(charge.stripeInvoiceId)

    console.log('✅ Stripe invoice found')
    console.log()
    console.log(`Invoice ID:       ${invoice.id}`)
    console.log('Status:           ' + invoice.status)
    console.log('Customer ID:      ' + invoice.customer)
    console.log('Amount Due:       ' + invoice.amount_due + ' ' + invoice.currency?.toUpperCase())
    console.log('Amount Paid:      ' + invoice.amount_paid + ' ' + invoice.currency?.toUpperCase())
    console.log('Created:          ' + new Date(invoice.created * 1000).toISOString())

    if (invoice.metadata) {
      console.log('Metadata:')
      for (const [key, value] of Object.entries(invoice.metadata)) {
        console.log(`  • ${key}: ${value}`)
      }
    }
    console.log()

    // Check invoice status
    if (invoice.status === 'paid') {
      console.log('✅ Invoice is marked as PAID in Stripe')
    } else if (invoice.status === 'open') {
      console.log('⚠️  Invoice is OPEN in Stripe (not paid yet)')
    } else if (invoice.status === 'draft') {
      console.log('⚠️  Invoice is still a DRAFT in Stripe')
    } else if (invoice.status === 'void') {
      console.log('❌ Invoice is VOID in Stripe')
    } else if (invoice.status === 'uncollectible') {
      console.log('❌ Invoice is UNCOLLECTIBLE in Stripe')
    } else {
      console.log(`⚠️  Invoice has unexpected status: ${invoice.status}`)
    }
    console.log()
  } catch (error: any) {
    console.log('❌ Failed to retrieve Stripe invoice')
    console.log(`   Error: ${error.message}`)
    console.log()
  }

  // Step 3: Check user subscription
  console.log('📋 User Subscription Information')
  console.log('-'.repeat(80))

  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId: charge.userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (subscriptions.length === 0) {
    console.log('❌ No subscriptions found for user')
  } else {
    console.log(`Found ${subscriptions.length} subscription(s) for user:`)
    console.log()

    for (const sub of subscriptions) {
      console.log(`Subscription ID:   ${sub.id}`)
      console.log(`  Type:            ${sub.transactionType}`)
      console.log(`  Status:          ${sub.status}`)
      console.log(`  Tier:            ${sub.tier}`)
      console.log(`  Price ID:        ${sub.stripePriceId || 'N/A'}`)
      console.log(`  Period End:      ${sub.currentPeriodEnd}`)
      console.log(`  Cancel At End:   ${sub.cancelAtPeriodEnd}`)
      console.log(`  Created:         ${sub.createdAt}`)

      if (sub.metadata) {
        const metadata = sub.metadata as Record<string, unknown>
        if (Object.keys(metadata).length > 0) {
          console.log('  Metadata:')
          for (const [key, value] of Object.entries(metadata)) {
            console.log('    • ' + key + ': ' + JSON.stringify(value))
          }
        }
      }
      console.log()
    }
  }

  // Check for active lifetime subscription
  const lifetimeSubscription = subscriptions.find(
    (sub) =>
      sub.transactionType === TransactionType.LIFETIME && sub.status === SubscriptionStatus.ACTIVE,
  )

  // Step 4: Analysis and recommendations
  console.log('='.repeat(80))
  console.log('🔍 Analysis & Recommendations')
  console.log('='.repeat(80))
  console.log()

  const issues: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []

  // Analyze the situation
  if (charge.status !== 'paid' && charge.status !== 'confirmed') {
    issues.push(`OpenNode charge status is '${charge.status}' (expected 'paid' or 'confirmed')`)
    recommendations.push('Wait for OpenNode to confirm payment before proceeding')
  }

  if (!charge.lastWebhookAt) {
    issues.push('OpenNode charge has never received a webhook (lastWebhookAt is NULL)')
    if (charge.status === 'paid' || charge.status === 'confirmed') {
      recommendations.push('This indicates webhook processing failed or never occurred')
    }
  }

  if (!lifetimeSubscription) {
    issues.push('User does not have an active LIFETIME subscription')
    if (charge.status === 'paid' || charge.status === 'confirmed') {
      recommendations.push('Run the recovery script to complete payment processing')
    }
  } else {
    console.log('✅ User has an active LIFETIME subscription')
    if (!charge.lastWebhookAt) {
      warnings.push('Subscription exists but lastWebhookAt is NULL')
      recommendations.push('Run recovery script with --dry-run to update lastWebhookAt')
    }
  }

  // Print findings
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ No issues detected - payment appears to be processed correctly')
  } else {
    if (issues.length > 0) {
      console.log('❌ Issues Found:')
      for (const issue of issues) {
        console.log(`   • ${issue}`)
      }
      console.log()
    }

    if (warnings.length > 0) {
      console.log('⚠️  Warnings:')
      for (const warning of warnings) {
        console.log(`   • ${warning}`)
      }
      console.log()
    }

    if (recommendations.length > 0) {
      console.log('💡 Recommendations:')
      for (const rec of recommendations) {
        console.log(`   • ${rec}`)
      }
      console.log()
    }
  }

  // Show command to run recovery script
  if (
    (charge.status === 'paid' || charge.status === 'confirmed') &&
    (!lifetimeSubscription || !charge.lastWebhookAt)
  ) {
    console.log('To fix this issue, run:')
    console.log()
    console.log('  # Dry run (safe, no changes):')
    console.log(
      '  doppler run -- bun run scripts/fix-opennode-payment.ts --dry-run ' +
        charge.stripeInvoiceId,
    )
    console.log()
    console.log('  # Actual fix:')
    console.log(
      '  doppler run -- bun run scripts/fix-opennode-payment.ts ' + charge.stripeInvoiceId,
    )
    console.log()
  }

  console.log('='.repeat(80))
  console.log()
}

async function main() {
  try {
    // If no arguments provided, run discovery mode
    if (!invoiceId && !chargeId) {
      await showDiscoverySummary()
    } else {
      await checkSingleCharge()
    }
  } catch (error) {
    console.error()
    console.error('='.repeat(80))
    console.error('ERROR')
    console.error('='.repeat(80))
    console.error('❌ An error occurred:')
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
