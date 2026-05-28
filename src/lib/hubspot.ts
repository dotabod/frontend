import { captureException } from '@sentry/nextjs'
import fetch from 'node-fetch'

const CRM_BASE = 'https://api.hubapi.com/crm/v3'

interface PropertyOption {
  label: string
  value: string
  displayOrder: number
}

interface PropertyDef {
  name: string
  label: string
  type: 'string' | 'enumeration'
  fieldType: 'text' | 'select'
  options?: PropertyOption[]
}

const SUBSCRIPTION_OPTIONS: PropertyOption[] = [
  { displayOrder: 0, label: 'Free', value: 'free' },
  { displayOrder: 1, label: 'Pro', value: 'pro' },
  { displayOrder: 2, label: 'Pro · Trial', value: 'pro_trial' },
  { displayOrder: 3, label: 'Pro · Lifetime', value: 'pro_lifetime' },
  { displayOrder: 4, label: 'Pro · Past Due', value: 'pro_past_due' },
]

const CONTACT_PROPERTIES: PropertyDef[] = [
  { fieldType: 'text', label: 'Twitch Username', name: 'twitch_username', type: 'string' },
  {
    fieldType: 'select',
    label: 'Dotabod Subscription',
    name: 'dotabod_subscription',
    options: SUBSCRIPTION_OPTIONS,
    type: 'enumeration',
  },
]

export function subscriptionToValue(
  sub: { tier?: string | null; status?: string | null; transactionType?: string | null } | null,
): string {
  if (!sub?.tier || sub.tier === 'FREE') {
    return 'free'
  }
  if (sub.transactionType === 'LIFETIME') {
    return 'pro_lifetime'
  }
  if (sub.status === 'TRIALING') {
    return 'pro_trial'
  }
  if (sub.status === 'PAST_DUE') {
    return 'pro_past_due'
  }
  return 'pro'
}

// Memoized per server instance so we only attempt property creation once.
let propertiesEnsured: Promise<void> | null = null

async function readBody(res: { text(): Promise<string> }): Promise<string> {
  return res.text().catch(() => '')
}

async function createProperty(token: string, prop: PropertyDef) {
  const res = await fetch(`${CRM_BASE}/properties/contacts`, {
    body: JSON.stringify({
      fieldType: prop.fieldType,
      groupName: 'contactinformation',
      label: prop.label,
      name: prop.name,
      type: prop.type,
      ...(prop.options ? { options: prop.options } : {}),
    }),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    method: 'POST',
  })
  // 409 means the property already exists, which is the expected steady state.
  if (!res.ok && res.status !== 409) {
    const detail = await readBody(res)
    throw new Error(
      `Failed to create HubSpot property ${prop.name}: ${res.status} ${res.statusText} ${detail}`,
    )
  }
}

function ensureContactProperties(token: string) {
  if (!propertiesEnsured) {
    propertiesEnsured = Promise.all(CONTACT_PROPERTIES.map((p) => createProperty(token, p)))
      .then(() => {})
      .catch((error) => {
        // Allow a retry on the next request rather than caching the failure.
        propertiesEnsured = null
        throw error
      })
  }
  return propertiesEnsured
}

// Best-effort: never throws, so it can't break the visitor-token response.
// `subscription` is optional: when omitted (e.g. the tier lookup failed) we leave
// the existing dotabod_subscription value untouched rather than overwriting it.
export async function syncHubSpotContact(
  token: string,
  { email, username, subscription }: { email: string; username: string; subscription?: string },
) {
  try {
    await ensureContactProperties(token)
    const properties = {
      twitch_username: username,
      ...(subscription ? { dotabod_subscription: subscription } : {}),
    }
    // PATCH by email supports partial updates; batch/upsert with idProperty=email
    // does not and returns 409 for any existing contact.
    const patchUrl = `${CRM_BASE}/objects/contacts/${encodeURIComponent(email)}?idProperty=email`
    const patch = () =>
      fetch(patchUrl, {
        body: JSON.stringify({ properties }),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
    const patchRes = await patch()
    if (patchRes.ok) {
      return
    }
    // Contact doesn't exist yet (visitor-identification didn't create one) — create it.
    if (patchRes.status === 404) {
      const createRes = await fetch(`${CRM_BASE}/objects/contacts`, {
        body: JSON.stringify({ properties: { email, ...properties } }),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (createRes.ok) {
        return
      }
      // 409 means the contact was created between our PATCH (404) and POST — either
      // visitor-identification finished provisioning it, or a concurrent request won
      // the race. Retry the PATCH so our property updates still apply.
      if (createRes.status === 409) {
        const retryRes = await patch()
        if (retryRes.ok) {
          return
        }
        const retryDetail = await readBody(retryRes)
        throw new Error(
          `Failed to update HubSpot contact after create-409: ${retryRes.status} ${retryRes.statusText} ${retryDetail}`,
        )
      }
      const createDetail = await readBody(createRes)
      throw new Error(
        `Failed to create HubSpot contact: ${createRes.status} ${createRes.statusText} ${createDetail}`,
      )
    }
    const patchDetail = await readBody(patchRes)
    throw new Error(
      `Failed to update HubSpot contact: ${patchRes.status} ${patchRes.statusText} ${patchDetail}`,
    )
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)))
  }
}
