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

async function ensureContactProperties(token: string) {
  await Promise.all(
    CONTACT_PROPERTIES.map(async (prop) => {
      const res = await fetch(`${CRM_BASE}/properties/contacts`, {
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
    fetch(patchUrl, {
      body: JSON.stringify({ properties }),
      headers: hsHeaders(token),
      method: 'PATCH',
    })

  const patchRes = await patch()
  if (patchRes.ok) return
  if (patchRes.status === 404) {
    const createRes = await fetch(`${CRM_BASE}/objects/contacts`, {
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

    // Optional ?hours= override for manual runs (e.g. wider catch-up); default 2h.
    const hoursParam = Number(new URL(req.url).searchParams.get('hours'))
    const lookback = Number.isFinite(hoursParam) && hoursParam > 0 ? hoursParam : LOOKBACK_HOURS

    await ensureContactProperties(token)
    const contacts = await fetchChanged(sql, lookback)

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

    return new Response(JSON.stringify({ considered: contacts.length, failed, synced }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('sync-hubspot fatal', String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  } finally {
    await sql.end()
  }
})
