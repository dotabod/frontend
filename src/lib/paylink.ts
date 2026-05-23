import crypto from 'node:crypto'

export interface PaylinkToken {
  invoiceId: string
  expiresAt: number
}

/**
 * Verifies and decodes a paylink token
 */
export function verifyPaylinkToken(invoiceId: string, token: string): PaylinkToken | null {
  const [signature, expStr] = (token || '').split('.')

  if (!signature || !expStr) return null

  const expiresAt = Number(expStr)
  if (!expiresAt || Date.now() > expiresAt) return null

  const payload = `${invoiceId}|${expStr}`
  const secret = process.env.PAYLINK_SIGNING_SECRET
  if (!secret) return null
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('base64url')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null
  }

  return { invoiceId, expiresAt }
}
