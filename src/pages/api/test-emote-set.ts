import * as Sentry from '@sentry/nextjs'
import type { GraphQLClient } from 'graphql-request'
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  create7TVClient,
  get7TVUser,
  getOrCreateEmoteSet,
  isSevenTVError,
  verifyEmoteInSet,
} from '@/lib/7tv'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { CHANGE_EMOTE_IN_SET, DELETE_EMOTE_SET } from '@/lib/gql'

async function deleteEmoteSet(client: GraphQLClient, emoteSetId: string) {
  try {
    console.log('Deleting emote set...')
    await client.request(DELETE_EMOTE_SET, { id: emoteSetId })
    console.log('Deleted emote set ID:', emoteSetId)
  } catch (error) {
    console.error(`Failed to delete emote set ID ${emoteSetId}:`, error)
    Sentry.captureException(error)
  }
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
  let emoteSetId: string | null = null
  let createdNewSet = false

  try {
    const stvResponse = await get7TVUser(twitchId)
    const userId = stvResponse.user.id

    try {
      const result = await getOrCreateEmoteSet({
        client,
        userId,
        twitchId,
        name: `TestEmoteSet${Date.now()}`.replace(/\s+/g, ''),
      })
      emoteSetId = result.emoteSetId
      createdNewSet = result.created
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        console.log('User does not have permission to use personal emote sets, skipping test')
        return res.status(200).json({ message: 'Test skipped - user lacks permissions' })
      }
      throw error
    }

    // Add emotes to the set
    console.log('Adding emotes to emote set...')
    try {
      console.log('Attempting to add TESTER emote...')
      await client.request(CHANGE_EMOTE_IN_SET, {
        id: emoteSetId,
        action: 'ADD',
        name: 'TESTER',
        emote_id: '60ae4ec30e35477634988c18',
      })
      console.log('Successfully added TESTER emote')
    } catch (error) {
      console.error('Error adding TESTER emote:', error)
      if (
        isSevenTVError(error) &&
        error.response.errors[0]?.extensions?.code === 'LACKING_PRIVILEGES'
      ) {
        console.log('User does not have permission to modify emote sets, skipping test')
        return res.status(200).json({ message: 'Test skipped - user lacks permissions' })
      }
      throw error
    }

    console.log('Verifying emote addition...')
    await verifyEmoteInSet(client, emoteSetId, 'TESTER')
    console.log('Emote set update verified successfully')

    res.status(200).json({ message: 'Emote set test completed successfully' })
  } catch (error: unknown) {
    console.error('Error during emote set test:', error)
    Sentry.withScope((scope) => {
      scope.setTag('test-related', 'true')
      scope.setContext('testDetails', {
        twitchId,
        userId: 'N/A',
        emoteSetId: emoteSetId || 'N/A',
      })
      Sentry.captureException(error)
    })
    const errorMessage = error instanceof Error ? error.message : String(error)
    res.status(500).json({ message: 'Internal server error', error: errorMessage })
  } finally {
    if (emoteSetId && createdNewSet) {
      try {
        await deleteEmoteSet(client, emoteSetId)
      } catch (error) {
        if (
          isSevenTVError(error) &&
          error.response.errors[0]?.extensions?.code === 'LACKING_PRIVILEGES'
        ) {
          console.log('User does not have permission to delete emote sets, skipping cleanup')
        } else {
          console.error(`Failed to delete emote set ID ${emoteSetId}:`, error)
          Sentry.captureException(error)
        }
      }
    }
  }
}

export default withMethods(['GET'], handler)
