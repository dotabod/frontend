import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import { subscriptionToValue, syncHubSpotContact } from '@/lib/hubspot'
import { getSubscription } from '@/utils/subscription'

const HUBSPOT_VISITOR_TOKEN_URL =
  'https://api.hubapi.com/visitor-identification/2026-03/tokens/create'

// Best-effort, fire-and-forget: enrich the HubSpot contact without blocking the
// token response that gates the chat widget load.
async function enrichContact(token: string, userId: string, email: string, username: string) {
  let subscription: string | undefined
  try {
    subscription = subscriptionToValue(await getSubscription(userId))
  } catch (error) {
    // Leave subscription undefined so a transient DB error never overwrites the
    // contact's real tier with "free".
    captureException(error instanceof Error ? error : new Error(String(error)))
  }
  await syncHubSpotContact(token, { email, username, subscription })
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const email = session?.user?.email

  // Anonymous visitors have no identity to verify; the widget loads unidentified.
  if (!email) {
    return res.status(204).end()
  }

  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN
  if (!token) {
    captureException(new Error('HUBSPOT_PRIVATE_APP_TOKEN is not set'))
    return res.status(500).json({ message: 'HubSpot is not configured' })
  }

  const [firstName, ...rest] = (session.user.name ?? '').trim().split(' ')
  const lastName = rest.join(' ')

  let visitorToken: string
  try {
    const response = await fetch(HUBSPOT_VISITOR_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      }),
    })

    if (!response.ok) {
      throw new Error(
        `HubSpot visitor token request failed: ${response.status} ${response.statusText}`,
      )
    }

    const data = (await response.json()) as { token?: string }
    if (!data.token) {
      throw new Error('HubSpot visitor token response missing token')
    }
    visitorToken = data.token
  } catch (error: unknown) {
    captureException(error instanceof Error ? error : new Error(String(error)))
    return res.status(500).json({ message: 'Failed to create visitor token' })
  }

  // Respond immediately — the widget only needs the token to identify the visitor.
  res.status(200).json({ email, token: visitorToken })

  // Skip enrichment while impersonating: the session id is the admin's but the
  // email/name are the impersonated user's, so writing would corrupt their contact.
  if (!session.user.isImpersonating) {
    void enrichContact(token, session.user.id, email, session.user.name ?? '').catch((error) => {
      captureException(error instanceof Error ? error : new Error(String(error)))
    })
  }
}

export default withMethods(['GET'], handler)
