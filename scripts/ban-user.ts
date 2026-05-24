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

for (let i = 0; i < args.length; i++) {
  const v = args[i]
  if (v === '--by' && args[i + 1]) {
    byArg = args[i + 1]
    i++
  } else if (v === '--by-name' && args[i + 1]) {
    byNameArg = args[i + 1]
    i++
  } else if (!v.startsWith('--')) {
    if (!userIdArg) userIdArg = v
    else if (!reasonArg) reasonArg = v
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

async function resolveTarget(): Promise<{ id: string; name: string }> {
  if (byNameArg && userIdArg) {
    const u = await prisma.user.findFirst({
      select: { id: true, name: true },
      where: { name: userIdArg },
    })
    if (!u) throw new Error(`No user found by name: ${userIdArg}`)
    return u
  }
  const u = await prisma.user.findUnique({
    select: { id: true, name: true },
    where: { id: userIdArg! },
  })
  if (!u) throw new Error(`No user found by id: ${userIdArg}`)
  return u
}

async function main() {
  const target = await resolveTarget()
  console.log(`Banning user ${target.name} (${target.id}) — reason: ${reasonArg}`)

  // Inventory paid subscriptions so the operator knows whether to cancel
  // upstream charges manually.
  const [stripeSubs, openNodeCharges, nowPayments, paypalSubs] = await Promise.all([
    prisma.subscription.findMany({
      select: { id: true, tier: true, status: true, stripeSubscriptionId: true },
      where: { userId: target.id, status: { in: ['ACTIVE', 'TRIALING'] } },
    }),
    prisma.openNodeCharge.findMany({
      select: { id: true, status: true },
      where: { userId: target.id, status: { in: ['paid', 'confirmed'] } },
    }),
    prisma.nowPaymentsInvoice.findMany({
      select: { id: true, status: true },
      where: { userId: target.id, status: { in: ['finished', 'partially_paid', 'confirmed'] } },
    }),
    prisma.payPalSubscription.findMany({
      select: { id: true, status: true },
      where: { userId: target.id, status: { in: ['ACTIVE', 'APPROVED'] } },
    }),
  ])

  if (stripeSubs.length || openNodeCharges.length || nowPayments.length || paypalSubs.length) {
    console.warn('⚠️  Active billing artifacts found — cancel/refund manually if needed:')
    if (stripeSubs.length) console.warn('   Stripe subscriptions:', stripeSubs)
    if (openNodeCharges.length) console.warn('   OpenNode charges:', openNodeCharges)
    if (nowPayments.length) console.warn('   NowPayments invoices:', nowPayments)
    if (paypalSubs.length) console.warn('   PayPal subscriptions:', paypalSubs)
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      data: {
        bannedAt: new Date(),
        bannedReason: reasonArg!,
        bannedBy: byArg ?? null,
      },
      where: { id: target.id },
    })

    // Flip the per-feature commandDisable setting so anything that gates
    // on it (bot chat reply path, dashboard banners) treats this user as
    // disabled. Mirrors what commandDisable.disable() does in shared-utils.
    await tx.setting.upsert({
      create: {
        key: 'commandDisable',
        userId: target.id,
        value: true,
        disableReason: 'MANUAL_DISABLE',
        autoDisabledAt: new Date(),
        autoDisabledBy: byArg ?? null,
        disableMetadata: { banned: true, reason: reasonArg! },
      },
      update: {
        value: true,
        disableReason: 'MANUAL_DISABLE',
        autoDisabledAt: new Date(),
        autoDisabledBy: byArg ?? null,
        disableMetadata: { banned: true, reason: reasonArg! },
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
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
