import crypto from 'node:crypto'
import type { InvoiceReturn } from '@nowpaymentsio/nowpayments-api-js/src/actions/create-invoice'
import type { GetPaymentStatusReturn } from '@nowpaymentsio/nowpayments-api-js/src/actions/get-payment-status'
import type { ICreateInvoice } from '@nowpaymentsio/nowpayments-api-js/src/types'

const NOWPAYMENTS_BASE_URL = 'https://api.nowpayments.io/v1'

function getApiKey(): string {
  const key = process.env.NOWPAYMENTS_API_KEY
  if (!key) throw new Error('NOWPAYMENTS_API_KEY is not set')
  return key
}

function getIpnSecret(): string {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!secret) throw new Error('NOWPAYMENTS_IPN_SECRET is not set')
  return secret
}

export type CreateInvoiceParams = ICreateInvoice
export type NowPaymentsInvoiceResponse = InvoiceReturn

const NOWPAYMENTS_STATUS_VALUES = [
  'waiting',
  'confirming',
  'confirmed',
  'sending',
  'partially_paid',
  'finished',
  'failed',
  'refunded',
  'expired',
] as const

type NowPaymentsStatus = (typeof NOWPAYMENTS_STATUS_VALUES)[number]

/**
 * Webhook (IPN) body. The SDK's `GetPaymentStatusReturn` covers the manual
 * status-check endpoint and is missing fields NOWPayments sends in webhooks
 * (parent_payment_id, invoice_id, payin_extra_id, fee). This extends it.
 */
export interface NowPaymentsPaymentStatus extends Omit<GetPaymentStatusReturn, 'payment_status'> {
  payment_status: NowPaymentsStatus
  parent_payment_id?: number | null
  invoice_id?: number | null
  payin_extra_id?: string | null
  actually_paid_at_fiat?: number
  payment_extra_ids?: unknown
  fee?: Record<string, unknown>
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      'x-api-key': getApiKey(),
      'Content-Type': 'application/json',
    },
  }
  if (body !== undefined) options.body = JSON.stringify(body)
  const res = await fetch(`${NOWPAYMENTS_BASE_URL}${path}`, options)
  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = text
  }
  if (!res.ok) {
    throw new Error(
      `NOWPayments ${method} ${path} failed: ${res.status} ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`,
    )
  }
  return parsed as T
}

export async function createNowPaymentsInvoice(
  params: CreateInvoiceParams,
): Promise<NowPaymentsInvoiceResponse> {
  return request<NowPaymentsInvoiceResponse>('POST', '/invoice', params)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Recursively sorts an object's keys alphabetically. Matches the canonicalization
 * NOWPayments uses to build the IPN signature.
 */
export function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => sortObject(v))
  }
  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortObject(value[key])
    }
    return sorted
  }
  return value
}

/**
 * Verifies an `x-nowpayments-sig` header against the parsed webhook body.
 * Algorithm: HMAC-SHA512(JSON.stringify(sortObject(body)), IPN_SECRET) → hex.
 */
export function verifyNowPaymentsSignature(
  body: Record<string, unknown>,
  signature: string | string[] | undefined,
): boolean {
  if (!signature || Array.isArray(signature)) return false
  const secret = getIpnSecret()
  const expected = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(sortObject(body)))
    .digest('hex')
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return false
  return crypto.timingSafeEqual(sigBuf, expBuf)
}

// Only 'finished' guarantees the funds are credited to our NOWPayments balance.
// 'confirmed' (on-chain confirmed, not yet exchanged) and 'sending' (payout in
// flight) are mid-flow and must NOT mark the Stripe invoice paid.
const NOWPAYMENTS_CONFIRMED_STATUSES = new Set<NowPaymentsStatus>(['finished'])

const NOWPAYMENTS_STATUSES = new Set<string>(NOWPAYMENTS_STATUS_VALUES)

function isNowPaymentsStatus(value: unknown): value is NowPaymentsStatus {
  return typeof value === 'string' && NOWPAYMENTS_STATUSES.has(value)
}

export function isNowPaymentsConfirmed(status: string | null | undefined): boolean {
  return isNowPaymentsStatus(status) && NOWPAYMENTS_CONFIRMED_STATUSES.has(status)
}

// Intentionally a partial check: only the fields the handler reads, not a full schema.
export function isNowPaymentsPaymentStatus(body: unknown): body is NowPaymentsPaymentStatus {
  return (
    isRecord(body) &&
    typeof body.order_id === 'string' &&
    typeof body.payment_id === 'number' &&
    isNowPaymentsStatus(body.payment_status)
  )
}
