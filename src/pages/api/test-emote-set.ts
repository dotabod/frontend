import * as Sentry from '@sentry/nextjs'
import type { GraphQLClient } from 'graphql-request'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { EmoteSetResponse } from '@/lib/7tv'
import { create7TVClient, get7TVUser } from '@/lib/7tv'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { CHANGE_EMOTE_IN_SET, GET_EMOTE_SET_FOR_CARD } from '@/lib/gql'

const TEST_EMOTE_ID = '60ae4ec30e35477634988c18'
const TEST_EMOTE_NAME = 'DOTABOD_TEST'

async function getEmoteSet(client: GraphQLClient, emoteSetId: string) {
  return (await client.request(GET_EMOTE_SET_FOR_CARD, {
    id: emoteSetId,
    limit: 1000,
  })) as EmoteSetResponse
}

function hasTestEmote(emoteSet: EmoteSetResponse) {
  return emoteSet.emoteSet.emotes.some((emote) => emote.name === TEST_EMOTE_NAME)
}

async function removeTestEmoteIfPresent(client: GraphQLClient, emoteSetId: string) {
  const emoteSet = await getEmoteSet(client, emoteSetId)

  if (!hasTestEmote(emoteSet)) {
    return
  }

  await client.request(CHANGE_EMOTE_IN_SET, {
    action: 'REMOVE',
    emote_id: TEST_EMOTE_ID,
    id: emoteSetId,
    name: TEST_EMOTE_NAME,
  })
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers?.authorization
  if (
    process.env.NODE_ENV !== 'development' &&
    process.env.VERCEL_ENV !== 'development' &&
    (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)
  ) {
    return res.status(401).json({ success: false })
  }

  if (req.method !== 'GET') {
    console.log('Invalid method:', req.method)
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const twitchId = process.env.CRON_TWITCH_ID

  if (!twitchId) {
    console.log('No Twitch ID found')
    return res.status(403).json({ message: 'Forbidden' })
  }

  const authToken = process.env.SEVENTV_AUTH
  if (!authToken) {
    console.log('No 7TV auth token found')
    return res.status(500).json({ message: 'Server configuration error' })
  }

  const client = create7TVClient(authToken)
  let userId = 'N/A'
  let activeEmoteSetId = 'N/A'
  let addedTestEmote = false

  try {
    const stvResponse = await get7TVUser(twitchId)
    userId = stvResponse.user?.id ?? ''
    activeEmoteSetId = stvResponse.emote_set?.id || 'N/A'

    if (!stvResponse.emote_set?.id) {
      throw new Error('No active 7TV emote set found')
    }

    console.log('Removing stale test emote if needed...')
    await removeTestEmoteIfPresent(client, stvResponse.emote_set.id)

    console.log('Adding test emote to active emote set...')
    await client.request(CHANGE_EMOTE_IN_SET, {
      action: 'ADD',
      emote_id: TEST_EMOTE_ID,
      id: stvResponse.emote_set.id,
      name: TEST_EMOTE_NAME,
    })
    addedTestEmote = true

    console.log('Verifying test emote addition...')
    const emoteSet = await getEmoteSet(client, stvResponse.emote_set.id)
    if (!hasTestEmote(emoteSet)) {
      throw new Error(`Emote ${TEST_EMOTE_NAME} not found in set`)
    }

    console.log('Removing test emote from active emote set...')
    await removeTestEmoteIfPresent(client, stvResponse.emote_set.id)
    addedTestEmote = false

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
    if (addedTestEmote && activeEmoteSetId !== 'N/A') {
      try {
        await removeTestEmoteIfPresent(client, activeEmoteSetId)
      } catch (error) {
        console.error(`Failed to remove test emote from set ID ${activeEmoteSetId}:`, error)
        Sentry.captureException(error)
      }
    }
  }
}

export default withMethods(['GET'], handler)
