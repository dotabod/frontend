import crypto from 'node:crypto'

export interface PaylinkToken {
  invoiceId: string
  expiresAt: number
}

/**
 * Generates a signed paylink token with expiration
 */
export function generatePaylinkToken(invoiceId: string, ttlMinutes = 60): string {
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000
  const payload = `${invoiceId}|${expiresAt}`
  const secret = process.env.PAYLINK_SIGNING_SECRET
  if (!secret) throw new Error('PAYLINK_SIGNING_SECRET is not set')
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url')

  return `${signature}.${expiresAt}`
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

/**
 * Generates a complete paylink URL
 */
export function generatePaylinkUrl(invoiceId: string, ttlMinutes = 60): string {
  const token = generatePaylinkToken(invoiceId, ttlMinutes)
  const baseUrl = process.env.NEXTAUTH_URL || 'https://dotabod.com'
  return `${baseUrl}/api/pay/bitcoin/${invoiceId}?token=${token}`
}
