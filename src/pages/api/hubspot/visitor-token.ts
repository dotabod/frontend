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

    // Best-effort enrichment of the contact record so it shows in the inbox sidebar.
    const subscription = await getSubscription(session.user.id).catch(() => null)
    await syncHubSpotContact(token, {
      email,
      username: session.user.name ?? '',
      subscription: subscriptionToValue(subscription),
    })

    return res.status(200).json({ email, token: data.token })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    captureException(err)
    return res.status(500).json({ message: 'Failed to create visitor token' })
  }
}

export default withMethods(['GET'], handler)
