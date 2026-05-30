// Supabase Edge Function: sync-hubspot
//
// Invoked hourly by pg_cron (see supabase/migrations/20260528_hubspot_sync_cron.sql)
// via pg_net on the internal docker network. Syncs every user whose own row or
// whose subscription changed within the lookback window into HubSpot as a CRM
// contact. Deno port of frontend src/lib/hubspot.ts — keeps the property-ensure →
// PATCH-by-email → create-on-404 → retry-on-409 logic that pg_net alone can't do.
//
// Reads from the in-network Supabase Postgres using the edge runtime's existing
// POSTGRES_* env (no new DB secret). Secrets (HubSpot token + the shared request
// secret) live in Supabase Vault, NOT in the edge container env — this Coolify-
// managed stack regenerates the container env on every redeploy, so Vault is the
// durable home. Auth: the x-sync-secret header must match the Vault 'hubspot_sync_secret'
// (VERIFY_JWT is off on this stack and the anon key is public, so we gate ourselves).

import postgres from 'npm:postgres@3.4.5'

const CRM_BASE = 'https://api.hubapi.com/crm/v3'
const LOOKBACK_HOURS = Number(Deno.env.get('SYNC_LOOKBACK_HOURS') ?? '2')
const CONCURRENCY = 8

const VAULT_TOKEN_NAME = 'hubspot_private_app_token'
const VAULT_SYNC_SECRET_NAME = 'hubspot_sync_secret'

const SUBSCRIPTION_OPTIONS = [
  { displayOrder: 0, label: 'Free', value: 'free' },
  { displayOrder: 1, label: 'Pro', value: 'pro' },
  { displayOrder: 2, label: 'Pro · Trial', value: 'pro_trial' },
  { displayOrder: 3, label: 'Pro · Lifetime', value: 'pro_lifetime' },
  { displayOrder: 4, label: 'Pro · Past Due', value: 'pro_past_due' },
]

const CONTACT_PROPERTIES = [
  { fieldType: 'text', label: 'Twitch Username', name: 'twitch_username', type: 'string' },
  {
    fieldType: 'select',
    label: 'Dotabod Subscription',
    name: 'dotabod_subscription',
    options: SUBSCRIPTION_OPTIONS,
    type: 'enumeration',
  },
]

function hsHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// HubSpot private apps cap at ~100 requests / 10s (TEN_SECONDLY_ROLLING). Space
// every call ~120ms apart (~83/10s, comfortably under) and retry 429s honoring
// Retry-After. All HubSpot calls (across the concurrent workers) funnel through
// this single limiter, so concurrency controls DB/processing overlap, not request rate.
const MIN_INTERVAL_MS = 120
let nextSlot = 0

async function hsFetch(url: string, init: RequestInit, retries = 5): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const now = Date.now()
    const wait = Math.max(0, nextSlot - now)
    nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))

    const res = await fetch(url, init)
    if (res.status !== 429 || attempt >= retries) return res
    const retryAfter = Number(res.headers.get('Retry-After'))
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * (attempt + 1)
    await res.body?.cancel()
    await new Promise((r) => setTimeout(r, backoff))
  }
}

async function ensureContactProperties(token: string) {
  await Promise.all(
    CONTACT_PROPERTIES.map(async (prop) => {
      const res = await hsFetch(`${CRM_BASE}/properties/contacts`, {
        body: JSON.stringify({ groupName: 'contactinformation', ...prop }),
        headers: hsHeaders(token),
        method: 'POST',
      })
      // 409 = property already exists, the expected steady state.
      if (!res.ok && res.status !== 409) {
        throw new Error(`ensure property ${prop.name} failed: ${res.status} ${await res.text()}`)
      }
    }),
  )
}

interface Contact {
  email: string
  username: string
  subscription: string
}

// Mirrors syncHubSpotContact in src/lib/hubspot.ts: PATCH by email, create on 404,
// retry PATCH on a create-409 race.
async function syncContact(token: string, { email, username, subscription }: Contact) {
  const properties = { dotabod_subscription: subscription, twitch_username: username }
  const patchUrl = `${CRM_BASE}/objects/contacts/${encodeURIComponent(email)}?idProperty=email`
  const patch = () =>
    hsFetch(patchUrl, {
      body: JSON.stringify({ properties }),
      headers: hsHeaders(token),
      method: 'PATCH',
    })

  const patchRes = await patch()
  if (patchRes.ok) return
  if (patchRes.status === 404) {
    const createRes = await hsFetch(`${CRM_BASE}/objects/contacts`, {
      body: JSON.stringify({ properties: { email, ...properties } }),
      headers: hsHeaders(token),
      method: 'POST',
    })
    if (createRes.ok) return
    if (createRes.status === 409) {
      const retry = await patch()
      if (retry.ok) return
      throw new Error(`patch-after-409 failed: ${retry.status} ${await retry.text()}`)
    }
    throw new Error(`create failed: ${createRes.status} ${await createRes.text()}`)
  }
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`)
}

function dbClient() {
  return postgres({
    database: Deno.env.get('POSTGRES_DB') ?? 'postgres',
    host: Deno.env.get('POSTGRES_HOST') ?? 'supabase-db',
    max: 4,
    password: Deno.env.get('POSTGRES_PASSWORD') ?? '',
    port: Number(Deno.env.get('POSTGRES_PORT') ?? '5432'),
    ssl: false,
    username: 'postgres',
  })
}

async function readSecrets(sql: ReturnType<typeof postgres>) {
  const rows = (await sql`
    select name, decrypted_secret from vault.decrypted_secrets
    where name in (${VAULT_TOKEN_NAME}, ${VAULT_SYNC_SECRET_NAME})
  `) as unknown as { name: string; decrypted_secret: string }[]
  const map = new Map(rows.map((r) => [r.name, r.decrypted_secret]))
  return {
    syncSecret: map.get(VAULT_SYNC_SECRET_NAME) ?? '',
    token: map.get(VAULT_TOKEN_NAME) ?? '',
  }
}

// Users whose own row OR whose subscription changed in the window, with the
// "best" subscription mapped to a HubSpot value (mirrors subscriptionToValue +
// getSubscription's active-first / lifetime / most-recent preference).
async function fetchChanged(sql: ReturnType<typeof postgres>, hours: number): Promise<Contact[]> {
  const rows = await sql`
    with picked as (
      select distinct on (s."userId") s."userId",
        case
          when s.tier::text = 'FREE' then 'free'
          when s."transactionType"::text = 'LIFETIME' then 'pro_lifetime'
          when s.status::text = 'TRIALING' then 'pro_trial'
          when s.status::text = 'PAST_DUE' then 'pro_past_due'
          else 'pro'
        end as sub_value
      from subscriptions s
      order by s."userId",
        (case when s.status::text in ('ACTIVE', 'TRIALING') then 0 else 1 end),
        (case when s."transactionType"::text = 'LIFETIME' then 0 else 1 end),
        s.created_at desc
    )
    select u.email as email,
           coalesce(u."displayName", '') as username,
           coalesce(p.sub_value, 'free') as subscription
    from users u
    left join picked p on p."userId" = u.id
    where u.email is not null
      and (
        u.updated_at > now() - ${hours}::float8 * interval '1 hour'
        or exists (
          select 1 from subscriptions s2
          where s2."userId" = u.id and s2.updated_at > now() - ${hours}::float8 * interval '1 hour'
        )
      )
  `
  return rows as unknown as Contact[]
}

// Targeted reheal: sync an explicit list of emails (e.g. contacts that failed an
// earlier run and may never change again, so the updated_at window won't catch them).
async function fetchByEmails(
  sql: ReturnType<typeof postgres>,
  emails: string[],
): Promise<Contact[]> {
  const rows = await sql`
    with picked as (
      select distinct on (s."userId") s."userId",
        case
          when s.tier::text = 'FREE' then 'free'
          when s."transactionType"::text = 'LIFETIME' then 'pro_lifetime'
          when s.status::text = 'TRIALING' then 'pro_trial'
          when s.status::text = 'PAST_DUE' then 'pro_past_due'
          else 'pro'
        end as sub_value
      from subscriptions s
      order by s."userId",
        (case when s.status::text in ('ACTIVE', 'TRIALING') then 0 else 1 end),
        (case when s."transactionType"::text = 'LIFETIME' then 0 else 1 end),
        s.created_at desc
    )
    select u.email as email,
           coalesce(u."displayName", '') as username,
           coalesce(p.sub_value, 'free') as subscription
    from users u
    left join picked p on p."userId" = u.id
    where u.email = any(${emails})
  `
  return rows as unknown as Contact[]
}

// Bounded-concurrency sync of a contact list. Request rate is governed by the
// throttle inside hsFetch, so concurrency only controls processing overlap.
async function runSync(token: string, contacts: Contact[]) {
  let synced = 0
  let failed = 0
  let cursor = 0
  const worker = async () => {
    while (cursor < contacts.length) {
      const c = contacts[cursor++]
      try {
        await syncContact(token, c)
        synced++
      } catch (err) {
        failed++
        console.error('sync failed for', c.email, String(err))
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, contacts.length) }, worker))
  return { considered: contacts.length, failed, synced }
}

Deno.serve(async (req) => {
  const sql = dbClient()
  try {
    const { token, syncSecret } = await readSecrets(sql)
    if (syncSecret && req.headers.get('x-sync-secret') !== syncSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }
    if (!token) {
      return new Response(JSON.stringify({ error: `vault secret ${VAULT_TOKEN_NAME} not set` }), {
        status: 500,
      })
    }

    // Two modes:
    //  - POST { emails: [...] } → targeted reheal of exactly those contacts.
    //  - otherwise → users/subs changed in the last ?hours= (default 2h).
    const body = await req.json().catch(() => ({}))
    const emails: string[] = Array.isArray(body?.emails)
      ? body.emails.filter((e: unknown): e is string => typeof e === 'string' && e.length > 0)
      : []

    await ensureContactProperties(token)

    let contacts: Contact[]
    if (emails.length > 0) {
      contacts = await fetchByEmails(sql, emails)
    } else {
      const hoursParam = Number(new URL(req.url).searchParams.get('hours'))
      const lookback = Number.isFinite(hoursParam) && hoursParam > 0 ? hoursParam : LOOKBACK_HOURS
      contacts = await fetchChanged(sql, lookback)
    }

    const result = await runSync(token, contacts)
    return new Response(JSON.stringify({ mode: emails.length > 0 ? 'emails' : 'window', ...result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('sync-hubspot fatal', String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  } finally {
    await sql.end()
  }
})
