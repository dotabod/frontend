import * as Sentry from '@sentry/nextjs'
import type { GraphQLClient } from 'graphql-request'
import type { NextApiRequest, NextApiResponse } from 'next'

import { create7TVClient, get7TVUser } from '@/lib/7tv'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { CHANGE_EMOTE_IN_SET, GET_EMOTE_SET_EMOTE_NAMES } from '@/lib/gql'

const TEST_EMOTE_ID = '60ae4ec30e35477634988c18'
const TEST_EMOTE_NAME = 'DOTABOD_TEST'

interface EmoteSetNamesResponse {
  emoteSet: {
    emotes: { name: string }[]
  }
}

const changeTestEmote = async function changeTestEmote(
  client: GraphQLClient,
  emoteSetId: string,
  action: 'ADD' | 'REMOVE',
) {
  await client.request(CHANGE_EMOTE_IN_SET, {
    action,
    emote_id: TEST_EMOTE_ID,
    id: emoteSetId,
    name: TEST_EMOTE_NAME,
  })
}

// Reads only the emote names: the full set is several megabytes, and 7TV can take 20 seconds
// to send it.
const hasTestEmote = async function hasTestEmote(client: GraphQLClient, emoteSetId: string) {
  const { emoteSet } = await client.request<EmoteSetNamesResponse>(GET_EMOTE_SET_EMOTE_NAMES, {
    id: emoteSetId,
  })
  return emoteSet.emotes.some((emote) => emote.name === TEST_EMOTE_NAME)
}

const handler = async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers?.authorization
  if (
    process.env.NODE_ENV !== 'development' &&
    process.env.VERCEL_ENV !== 'development' &&
    (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)
  ) {
    res.status(401).json({ success: false })
    return
  }

  if (req.method !== 'GET') {
    console.log('Invalid method:', req.method)
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  const twitchId = process.env.CRON_TWITCH_ID

  if (!twitchId) {
    console.log('No Twitch ID found')
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const authToken = process.env.SEVENTV_AUTH
  if (!authToken) {
    console.log('No 7TV auth token found')
    res.status(500).json({ message: 'Server configuration error' })
    return
  }

  const client = create7TVClient(authToken)
  let userId = 'N/A'
  let activeEmoteSetId = 'N/A'
  // Set before the add is sent, so the finally block removes the test emote whenever it might be
  // in the set: an add that times out can still land, and an add that fails because an earlier
  // run left the emote behind clears the way for the next run.
  let testEmoteMayBeInSet = false

  try {
    const stvResponse = await get7TVUser(twitchId)
    userId = stvResponse.user?.id ?? ''
    activeEmoteSetId = stvResponse.emote_set?.id ?? 'N/A'

    if (!stvResponse.emote_set?.id) {
      throw new Error('No active 7TV emote set found')
    }

    console.log('Adding test emote to active emote set...')
    testEmoteMayBeInSet = true
    await changeTestEmote(client, stvResponse.emote_set.id, 'ADD')

    console.log('Verifying test emote addition...')
    if (!(await hasTestEmote(client, stvResponse.emote_set.id))) {
      throw new Error(`Emote ${TEST_EMOTE_NAME} not found in set`)
    }

    console.log('Removing test emote from active emote set...')
    await changeTestEmote(client, stvResponse.emote_set.id, 'REMOVE')
    testEmoteMayBeInSet = false

    console.log('Emote set write test completed successfully')

    res.status(200).json({ message: 'Emote set test completed successfully' })
  } catch (error: unknown) {
    console.error('Error during emote set test:', error)
    Sentry.withScope((scope) => {
      scope.setTag('test-related', 'true')
      scope.setContext('testDetails', {
        emoteSetId: activeEmoteSetId,
        twitchId,
        userId,
      })
      Sentry.captureException(error)
    })
    const errorMessage = error instanceof Error ? error.message : String(error)
    res.status(500).json({ error: errorMessage, message: 'Internal server error' })
  } finally {
    if (testEmoteMayBeInSet && activeEmoteSetId !== 'N/A') {
      try {
        await changeTestEmote(client, activeEmoteSetId, 'REMOVE')
      } catch (error) {
        console.error(`Failed to remove test emote from set ID ${activeEmoteSetId}:`, error)
        Sentry.captureException(error)
      }
    }
  }
}

export default withMethods(['GET'], handler)
