#!/usr/bin/env -S pnpm dlx tsx

/**
 * One-time backfill: sync every Dotabod user with an email into HubSpot as a
 * CRM contact, so a Marketing Email blast can reach the whole user base.
 *
 * Today contacts are only synced when a logged-in user loads a page with the
 * HubSpot chat widget (see src/pages/api/hubspot/visitor-token.ts), so coverage
 * is partial. This walks all users and mirrors that same enrichment logic:
 * sets email, twitch_username, and dotabod_subscription via syncHubSpotContact.
 *
 * Idempotent: syncHubSpotContact PATCHes by email and creates on 404, so
 * re-running is safe. Errors per-contact are swallowed (Sentry) by the helper,
 * so the run never aborts mid-way; we keep our own success/skip counters.
 *
 * Usage:
 *   doppler run -- pnpm dlx tsx scripts/backfill-hubspot-contacts.ts [--limit N]
 */

import prisma from '@/lib/db'
import { subscriptionToValue, syncHubSpotContact } from '@/lib/hubspot'
import { getSubscription } from '@/utils/subscription'

const PAGE_SIZE = 1000
// Bound in-flight HubSpot requests to stay well under the private-app rate
// limit (~100-190 req/s) while keeping the run moving.
const CONCURRENCY = 8

const args = process.argv.slice(2)
let limit = Number.POSITIVE_INFINITY
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    limit = Number(args[i + 1])
    i++
  }
}

const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN
if (!token) {
  console.error('HUBSPOT_PRIVATE_APP_TOKEN is not set')
  process.exit(2)
}

let synced = 0
let failed = 0

async function syncUser(user: { id: string; email: string | null; displayName: string | null }) {
  if (!user.email) return
  let subscription: string | undefined
  try {
    subscription = subscriptionToValue(await getSubscription(user.id))
  } catch {
    // Leave subscription undefined so a transient DB error never overwrites the
    // contact's real tier with "free" — mirrors enrichContact in visitor-token.ts.
    subscription = undefined
  }
  try {
    await syncHubSpotContact(token!, {
      email: user.email,
      subscription,
      username: user.displayName ?? '',
    })
    synced++
  } catch {
    failed++
  }
  if ((synced + failed) % 500 === 0) {
    console.log(`  …processed ${synced + failed} (synced ${synced}, failed ${failed})`)
  }
}

// Run an array of users through syncUser with bounded concurrency.
async function runPool(
  users: Array<{ id: string; email: string | null; displayName: string | null }>,
) {
  let cursor = 0
  async function worker() {
    while (cursor < users.length) {
      const user = users[cursor++]
      await syncUser(user)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

async function main() {
  console.log('Backfilling HubSpot contacts from users with an email…')
  let lastId: string | null = null
  let processed = 0

  while (processed < limit) {
    const take = Math.min(PAGE_SIZE, limit - processed)
    const page = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, email: true, displayName: true },
      take,
      where: { email: { not: null }, ...(lastId ? { id: { gt: lastId } } : {}) },
    })
    if (page.length === 0) break

    await runPool(page)
    processed += page.length
    lastId = page[page.length - 1].id
    console.log(`Page done — ${processed} users processed (synced ${synced}, failed ${failed})`)
  }

  console.log(`✅ Done. Synced ${synced}, failed ${failed}, total processed ${processed}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
