import crypto from 'node:crypto'
import type { InvoiceReturn } from '@nowpaymentsio/nowpayments-api-js/src/actions/create-invoice'
import type { GetPaymentStatusReturn } from '@nowpaymentsio/nowpayments-api-js/src/actions/get-payment-status'
import type { ICreateInvoice, ICreatePayment } from '@nowpaymentsio/nowpayments-api-js/src/types'

const NOWPAYMENTS_BASE_URL = 'https://api.nowpayments.io/v1'

if (!process.env.NOWPAYMENTS_API_KEY) {
  throw new Error('NOWPAYMENTS_API_KEY is not set')
}
if (!process.env.NOWPAYMENTS_IPN_SECRET) {
  throw new Error('NOWPAYMENTS_IPN_SECRET is not set')
}

export type { ICreateInvoice, ICreatePayment, InvoiceReturn, GetPaymentStatusReturn }

export type CreateInvoiceParams = ICreateInvoice
export type NowPaymentsInvoiceResponse = InvoiceReturn

export type NowPaymentsStatus =
  | 'waiting'
  | 'confirming'
  | 'confirmed'
  | 'sending'
  | 'partially_paid'
  | 'finished'
  | 'failed'
  | 'refunded'
  | 'expired'

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
  const res = await fetch(`${NOWPAYMENTS_BASE_URL}${path}`, {
    method,
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY as string,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
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

export async function getNowPaymentsPaymentStatus(
  paymentId: string | number,
): Promise<NowPaymentsPaymentStatus> {
  return request<NowPaymentsPaymentStatus>('GET', `/payment/${paymentId}`)
}

export async function getNowPaymentsStatus(): Promise<{ message: string }> {
  return request<{ message: string }>('GET', '/status')
}

/**
 * Recursively sorts an object's keys alphabetically. Matches the canonicalization
 * NOWPayments uses to build the IPN signature.
 */
function sortObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sortObject(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortObject((value as Record<string, unknown>)[key])
    }
    return sorted as unknown as T
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
  const secret = process.env.NOWPAYMENTS_IPN_SECRET as string
  const expected = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(sortObject(body)))
    .digest('hex')
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return false
  return crypto.timingSafeEqual(sigBuf, expBuf)
}

export const NOWPAYMENTS_CONFIRMED_STATUSES = new Set<NowPaymentsStatus>(['finished'])
export const NOWPAYMENTS_TERMINAL_STATUSES = new Set<NowPaymentsStatus>([
  'finished',
  'failed',
  'refunded',
  'expired',
])

export function isNowPaymentsConfirmed(status: string | null | undefined): boolean {
  return !!status && NOWPAYMENTS_CONFIRMED_STATUSES.has(status as NowPaymentsStatus)
}
