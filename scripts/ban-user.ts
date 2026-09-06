#!/usr/bin/env -S pnpm dlx tsx

/**
 * Ban a Dotabod user.
 *
 * Sets users.banned_at + bans the per-feature commandDisable flag and
 * deletes their twitch accounts row (which fires the backend watcher →
 * tears down EventSub subs). NextAuth uses JWT strategy, so live cookies
 * stay valid until the user hits requireDashboardAccess(), which now
 * checks users.bannedAt and redirects to /error?error=ACCOUNT_BANNED.
 *
 * Active Stripe / OpenNode / NowPayments / PayPal subscriptions are NOT
 * cancelled automatically — the script prints a warning if any are found
 * and leaves cancellation to a human (refund decisions, partial-period
 * credit, gift sub handling, etc.).
 *
 * Usage:
 *   doppler run -- pnpm dlx tsx scripts/ban-user.ts <userId> "<reason>" [--by <adminUserId>]
 *   doppler run -- pnpm dlx tsx scripts/ban-user.ts --by-name <twitchLogin> "<reason>"
 */

import { PrismaClient } from '@prisma/client'

const args = process.argv.slice(2)
let userIdArg: string | null = null
let reasonArg: string | null = null
let byArg: string | null = null
let byNameArg: string | null = null

for (let i = 0; i < args.length; i += 1) {
  const v = args[i]
  if (v === '--by' && args[i + 1]) {
    byArg = args[i + 1]
    i += 1
  } else if (v === '--by-name' && args[i + 1]) {
    byNameArg = args[i + 1]
    i += 1
  } else if (!v.startsWith('--')) {
    if (!userIdArg) {
      userIdArg = v
    } else if (!reasonArg) {
      reasonArg = v
    }
  }
}

if (!userIdArg || !reasonArg) {
  console.error(
    'Usage: ban-user.ts <userId> "<reason>" [--by <adminUserId>]\n' +
      '   or: ban-user.ts --by-name <twitchLogin> "<reason>"   (resolves userId from users.name)',
  )
  process.exit(2)
}

const prisma = new PrismaClient()

const resolveTarget = async function resolveTarget(): Promise<{ id: string; name: string }> {
  if (byNameArg && userIdArg) {
    const u = await prisma.user.findFirst({
      select: { id: true, name: true },
      where: { name: userIdArg },
    })
    if (!u) {
      throw new Error(`No user found by name: ${userIdArg}`)
    }
    return u
  }
  const u = await prisma.user.findUnique({
    select: { id: true, name: true },
    where: { id: userIdArg! },
  })
  if (!u) {
    throw new Error(`No user found by id: ${userIdArg}`)
  }
  return u
}

const main = async function main() {
  const target = await resolveTarget()
  console.log(`Banning user ${target.name} (${target.id}) — reason: ${reasonArg}`)

  // Inventory paid subscriptions so the operator knows whether to cancel
  // upstream charges manually.
  const [stripeSubs, openNodeCharges, nowPayments, paypalSubs] = await Promise.all([
    prisma.subscription.findMany({
      select: { id: true, status: true, stripeSubscriptionId: true, tier: true },
      where: { status: { in: ['ACTIVE', 'TRIALING'] }, userId: target.id },
    }),
    prisma.openNodeCharge.findMany({
      select: { id: true, status: true },
      where: { status: { in: ['paid', 'confirmed'] }, userId: target.id },
    }),
    prisma.nowPaymentsInvoice.findMany({
      select: { id: true, status: true },
      where: { status: { in: ['finished', 'partially_paid', 'confirmed'] }, userId: target.id },
    }),
    prisma.payPalSubscription.findMany({
      select: { id: true, status: true },
      where: { status: { in: ['ACTIVE', 'APPROVED'] }, userId: target.id },
    }),
  ])

  if (stripeSubs.length || openNodeCharges.length || nowPayments.length || paypalSubs.length) {
    console.warn('⚠️  Active billing artifacts found — cancel/refund manually if needed:')
    if (stripeSubs.length) {
      console.warn('   Stripe subscriptions:', stripeSubs)
    }
    if (openNodeCharges.length) {
      console.warn('   OpenNode charges:', openNodeCharges)
    }
    if (nowPayments.length) {
      console.warn('   NowPayments invoices:', nowPayments)
    }
    if (paypalSubs.length) {
      console.warn('   PayPal subscriptions:', paypalSubs)
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      data: {
        bannedAt: new Date(),
        bannedBy: byArg ?? null,
        bannedReason: reasonArg!,
      },
      where: { id: target.id },
    })

    // Flip the per-feature commandDisable setting so anything that gates
    // on it (bot chat reply path, dashboard banners) treats this user as
    // disabled. Mirrors what commandDisable.disable() does in shared-utils.
    await tx.setting.upsert({
      create: {
        autoDisabledAt: new Date(),
        autoDisabledBy: byArg ?? null,
        disableMetadata: { banned: true, reason: reasonArg! },
        disableReason: 'MANUAL_DISABLE',
        key: 'commandDisable',
        userId: target.id,
        value: true,
      },
      update: {
        autoDisabledAt: new Date(),
        autoDisabledBy: byArg ?? null,
        disableMetadata: { banned: true, reason: reasonArg! },
        disableReason: 'MANUAL_DISABLE',
        value: true,
      },
      where: { key_userId: { key: 'commandDisable', userId: target.id } },
    })

    // Drop the Twitch account row — fires the backend's DELETE:accounts
    // watcher → stopUserSubscriptions → eventSubMap cleanup + Twitch
    // EventSub conduit shard cleanup. The user can re-OAuth and create a
    // fresh row attached to the same users.id (allowDangerousEmailAccountLinking),
    // but the bannedAt on users survives that re-link and the jwt() gate
    // blocks login.
    await tx.account.deleteMany({ where: { userId: target.id } })

    // Note: NextAuth JWT strategy — no `sessions` table to delete from.
    // Live cookies remain valid until the user navigates to a page guarded
    // by requireDashboardAccess(), which now checks users.bannedAt and
    // redirects banned users to /error?error=ACCOUNT_BANNED.
  })

  console.log(`✅ Banned ${target.name} (${target.id}).`)
  console.log(
    'Backend watchers will tear down EventSub subscriptions + invalidate GSI tokens automatically.',
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => prisma.$disconnect())
