const LIVE_BASE_URL = 'https://api-m.paypal.com'
const SANDBOX_BASE_URL = 'https://api-m.sandbox.paypal.com'

function getBaseUrl(): string {
  if (process.env.PAYPAL_API_BASE) return process.env.PAYPAL_API_BASE
  return process.env.NODE_ENV === 'production' ? LIVE_BASE_URL : SANDBOX_BASE_URL
}

function getClientId(): string {
  const id = process.env.PAYPAL_CLIENT_ID
  if (!id) throw new Error('PAYPAL_CLIENT_ID is not set')
  return id
}

function getClientSecret(): string {
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!secret) throw new Error('PAYPAL_CLIENT_SECRET is not set')
  return secret
}

function getWebhookId(): string {
  const id = process.env.PAYPAL_WEBHOOK_ID
  if (!id) throw new Error('PAYPAL_WEBHOOK_ID is not set')
  return id
}

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')
  const res = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = (await res.json()) as { access_token?: string; error_description?: string }
  if (!res.ok || !data.access_token) {
    throw new Error(`PayPal token request failed: ${res.status} ${data.error_description ?? ''}`)
  }
  return data.access_token
}

async function authedRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const token = await getAccessToken()
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  }
  if (body !== undefined) options.body = JSON.stringify(body)
  const res = await fetch(`${getBaseUrl()}${path}`, options)
  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = text
  }
  if (!res.ok) {
    throw new Error(
      `PayPal ${method} ${path} failed: ${res.status} ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`,
    )
  }
  return parsed as T
}

interface PayPalLink {
  href: string
  rel: string
  method?: string
}

interface PayPalOrderResponse {
  id: string
  status: string
  links?: PayPalLink[]
}

export interface PayPalCaptureResult {
  orderId: string
  status: string
  captureId: string | null
  payerId: string | null
}

function formatAmount(amountCents: number): string {
  return (amountCents / 100).toFixed(2)
}

function findApproveLink(links: PayPalLink[] | undefined): string {
  const approveUrl = links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href
  if (!approveUrl) {
    throw new Error('PayPal response returned no approval link')
  }
  return approveUrl
}

/**
 * Creates a one-time PayPal order (used only for lifetime purchases).
 */
export async function createOrder(params: {
  amountCents: number
  currency: string
  userId: string
  returnUrl: string
  cancelUrl: string
  description?: string
}): Promise<{ orderId: string; approveUrl: string }> {
  const order = await authedRequest<PayPalOrderResponse>('POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [
      {
        custom_id: params.userId,
        description: params.description,
        amount: {
          currency_code: params.currency.toUpperCase(),
          value: formatAmount(params.amountCents),
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      },
    },
  })
  return { orderId: order.id, approveUrl: findApproveLink(order.links) }
}

interface PayPalCaptureApiResponse {
  id: string
  status: string
  payer?: { payer_id?: string }
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id: string; status: string }>
    }
  }>
}

export async function captureOrder(orderId: string): Promise<PayPalCaptureResult> {
  const res = await authedRequest<PayPalCaptureApiResponse>(
    'POST',
    `/v2/checkout/orders/${orderId}/capture`,
    {},
    { 'PayPal-Request-Id': `capture-${orderId}` },
  )
  const capture = res.purchase_units?.[0]?.payments?.captures?.[0]
  return {
    orderId: res.id,
    status: res.status,
    captureId: capture?.id ?? null,
    payerId: res.payer?.payer_id ?? null,
  }
}

interface PayPalSubscriptionResponse {
  id: string
  status: string
  plan_id?: string
  subscriber?: { payer_id?: string }
  billing_info?: { next_billing_time?: string }
  links?: PayPalLink[]
}

/**
 * Creates a PayPal subscription against an existing billing plan. PayPal owns
 * the recurring schedule and auto-charges each cycle.
 */
export async function createSubscription(params: {
  planId: string
  userId: string
  returnUrl: string
  cancelUrl: string
  email?: string
}): Promise<{ subscriptionId: string; approveUrl: string }> {
  const sub = await authedRequest<PayPalSubscriptionResponse>('POST', '/v1/billing/subscriptions', {
    plan_id: params.planId,
    custom_id: params.userId,
    ...(params.email ? { subscriber: { email_address: params.email } } : {}),
    application_context: {
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      user_action: 'SUBSCRIBE_NOW',
      shipping_preference: 'NO_SHIPPING',
    },
  })
  return { subscriptionId: sub.id, approveUrl: findApproveLink(sub.links) }
}

export interface PayPalSubscriptionDetails {
  id: string
  status: string
  planId: string | null
  payerId: string | null
  nextBillingTime: string | null
  customId: string | null
}

export async function getSubscription(subscriptionId: string): Promise<PayPalSubscriptionDetails> {
  const sub = await authedRequest<PayPalSubscriptionResponse & { custom_id?: string }>(
    'GET',
    `/v1/billing/subscriptions/${subscriptionId}`,
  )
  return {
    id: sub.id,
    status: sub.status,
    planId: sub.plan_id ?? null,
    payerId: sub.subscriber?.payer_id ?? null,
    nextBillingTime: sub.billing_info?.next_billing_time ?? null,
    customId: sub.custom_id ?? null,
  }
}

interface VerifyWebhookResponse {
  verification_status: 'SUCCESS' | 'FAILURE'
}

export async function verifyWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
): Promise<boolean> {
  const get = (name: string): string => {
    const v = headers[name] ?? headers[name.toLowerCase()]
    return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
  }

  const body = {
    auth_algo: get('paypal-auth-algo'),
    cert_url: get('paypal-cert-url'),
    transmission_id: get('paypal-transmission-id'),
    transmission_sig: get('paypal-transmission-sig'),
    transmission_time: get('paypal-transmission-time'),
    webhook_id: getWebhookId(),
    webhook_event: JSON.parse(rawBody),
  }

  const res = await authedRequest<VerifyWebhookResponse>(
    'POST',
    '/v1/notifications/verify-webhook-signature',
    body,
  )
  return res.verification_status === 'SUCCESS'
}
