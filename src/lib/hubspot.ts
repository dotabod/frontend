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
    throw new Error(
      `Failed to create HubSpot property ${prop.name}: ${res.status} ${res.statusText}`,
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
// The existing dotabod_subscription value untouched rather than overwriting it.
export async function syncHubSpotContact(
  token: string,
  { email, username, subscription }: { email: string; username: string; subscription?: string },
) {
  try {
    await ensureContactProperties(token)
    // Upsert by email so a brand-new contact (not yet indexed from the visitor
    // Identification call) is created rather than 404ing on a plain update.
    const res = await fetch(`${CRM_BASE}/objects/contacts/batch/upsert`, {
      body: JSON.stringify({
        inputs: [
          {
            id: email,
            idProperty: 'email',
            properties: {
              twitch_username: username,
              ...(subscription ? { dotabod_subscription: subscription } : {}),
            },
          },
        ],
      }),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      method: 'POST',
    })
    if (!res.ok) {
      throw new Error(`Failed to upsert HubSpot contact: ${res.status} ${res.statusText}`)
    }
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)))
  }
}
