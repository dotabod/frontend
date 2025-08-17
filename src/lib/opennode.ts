import { createCharge, setCredentials, signatureIsValid, chargeInfo } from 'opennode'

if (!process.env.OPENNODE_API_KEY) {
  throw new Error('OPENNODE_API_KEY is not set')
}

// Initialize OpenNode client
setCredentials(
  process.env.OPENNODE_API_KEY,
  process.env.NODE_ENV === 'production' ? 'live' : 'dev',
)

export interface OpenNodeChargeParams {
  amount: number
  currency: string
  description: string
  customer_email?: string
  notif_email?: string
  customer_name?: string
  order_id?: string
  callback_url: string
  success_url: string
  auto_settle?: boolean
  ttl?: number
  metadata?: Record<string, any>
}

export interface OpenNodeCharge {
  id: string
  status: string
  amount: number
  currency: string
  hosted_checkout_url: string
  metadata?: Record<string, any>
}

/**
 * Creates an OpenNode charge
 */
export async function createOpenNodeCharge(params: OpenNodeChargeParams): Promise<OpenNodeCharge> {
  try {
    console.log('OPENNODE_API_KEY', process.env.OPENNODE_API_KEY)
    console.log('Creating OpenNode charge', params)
    const response = await createCharge(params)
    return { ...response, hosted_checkout_url: buildCheckoutUrl(response.id) }
  } catch (error) {
    console.error('Failed to create OpenNode charge:', error)
    throw error
  }
}

/**
 * Verifies OpenNode webhook signature
 */
export async function verifyOpenNodeWebhook(eventData: any): Promise<boolean> {
  try {
    return signatureIsValid(eventData) as boolean
  } catch (error) {
    console.error('OpenNode signature verification failed:', error)
    return false
  }
}

/**
 * Gets the status of an OpenNode charge
 */
export async function getOpenNodeChargeStatus(chargeId: string): Promise<OpenNodeCharge | null> {
  try {
    const response = await chargeInfo(chargeId)

    return { ...response, hosted_checkout_url: buildCheckoutUrl(response.id) }
  } catch (error) {
    console.error('Failed to get OpenNode charge status:', error)
    return null
  }
}


/**
 * Constructs hosted checkout URL with options
 */
export function buildCheckoutUrl(chargeId: string, hostedUrl?: string): string {
  const baseUrl =
    hostedUrl ||
    (process.env.NODE_ENV === 'development'
      ? `https://checkout.dev.opennode.com/${chargeId}`
      : `https://checkout.opennode.com/${chargeId}`)

  const params: string[] = []
  if (process.env.OPENNODE_CHECKOUT_DEFAULT_LN === 'true') params.push('ln=1')
  if (process.env.OPENNODE_CHECKOUT_HIDE_FIAT === 'true') params.push('hf=1')

  return params.length ? `${baseUrl}?${params.join('&')}` : baseUrl
}
