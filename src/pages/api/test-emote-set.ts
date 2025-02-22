import { withMethods } from '@/lib/api-middlewares/with-methods'
import {
  CHANGE_EMOTE_IN_SET,
  CREATE_EMOTE_SET,
  DELETE_EMOTE_SET,
  GET_EMOTE_SET_FOR_CARD,
} from '@/lib/gql'
import * as Sentry from '@sentry/nextjs'
import { GraphQLClient } from 'graphql-request'
import type { NextApiRequest, NextApiResponse } from 'next'

async function deleteEmoteSet(client: GraphQLClient, emoteSetId: string) {
  try {
    // Step 4: Delete the emote set
    console.log('Deleting emote set...')
    const deleteEmoteSetVariables = { id: emoteSetId }
    await client.request(DELETE_EMOTE_SET, deleteEmoteSetVariables)
    console.log('Deleted emote set ID:', emoteSetId)
  } catch (error) {
    console.error(`Failed to delete emote set ID ${emoteSetId}:`, error)
    // Optionally, report the failure to Sentry or another monitoring tool
    Sentry.captureException(error)
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers?.authorization
  if (
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

  const client = new GraphQLClient('https://7tv.io/v3/gql', {
    headers: {
      Cookie: `seventv-auth=${process.env.SEVENTV_AUTH}`,
    },
  })

  let emoteSetId: string | null = null

  try {
    console.log('Fetching user data from 7tv...')
    const response = await fetch(
      `https://7tv.io/v3/users/twitch/${twitchId}?cacheBust=${Date.now()}`,
    )
    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.statusText}`)
    }
    const stvResponse = await response.json()
    const userId = stvResponse?.user?.id
    if (!userId) {
      throw new Error('User ID not found in 7tv response')
    }
    console.log('User ID:', userId)

    // Step 1: Create a new emote set
    console.log('Creating new emote set...')
    const createEmoteSetVariables = {
      user_id: userId,
      data: { name: `TestEmoteSet${Date.now()}` },
    }
    const createEmoteSetResult = (await client.request(
      CREATE_EMOTE_SET,
      createEmoteSetVariables,
    )) as { createEmoteSet: { id: string } } | undefined
    if (!createEmoteSetResult?.createEmoteSet?.id) {
      throw new Error('Failed to create emote set')
    }
    emoteSetId = createEmoteSetResult.createEmoteSet.id
    console.log('Created emote set ID:', emoteSetId)

    // Step 2: Add the emotes to their emote set
    console.log('Adding emotes to emote set...')
    try {
      await client.request(CHANGE_EMOTE_IN_SET, {
        id: emoteSetId,
        action: 'ADD',
        name: 'TESTER',
        emote_id: '60ae4ec30e35477634988c18',
      })
    } catch (error) {
      // Emote already exists in the set or other error
      console.log('Error adding emote to set:', error)
      try {
        await client.request(CHANGE_EMOTE_IN_SET, {
          id: emoteSetId,
          action: 'REMOVE',
          name: 'TESTER',
          emote_id: '60ae4ec30e35477634988c18',
        })
        await client.request(CHANGE_EMOTE_IN_SET, {
          id: emoteSetId,
          action: 'ADD',
          name: 'TESTER',
          emote_id: '60ae4ec30e35477634988c18',
        })
      } catch (innerError) {
        console.error('Failed to re-add emote after removal:', innerError)
        throw new Error('Failed to add emote after removal attempt')
      }
    }

    // Step 3: Verify the emotes are in the set
    console.log('Verifying emote set update...')
    const userEmoteSet = (await client.request(GET_EMOTE_SET_FOR_CARD, {
      id: emoteSetId,
      limit: 20,
    })) as
      | {
          emoteSet: {
            emote_count: number
            capacity: number
            flags: number
            emotes: Array<{
              id: string
              name: string
              data: {
                id: string
                name: string
                host: {
                  url: string
                  files: Array<{
                    name: string
                    format: string
                  }>
                }
              }
            }>
          }
        }
      | undefined
    if (!userEmoteSet?.emoteSet) {
      throw new Error('Emote set not found')
    }

    const emote = userEmoteSet.emoteSet.emotes.find((e: any) => e.name === 'TESTER')
    if (!emote) {
      throw new Error('Emote not found in set')
    }

    console.log('Emote set update verified successfully')

    res.status(200).json({ message: 'Emote set test completed successfully' })
  } catch (error: any) {
    console.error('Error during emote set test:', error)
    Sentry.withScope((scope) => {
      scope.setTag('test-related', 'true')
      scope.setContext('testDetails', {
        twitchId,
        userId: error.userId || 'N/A',
        emoteSetId: emoteSetId || 'N/A',
      })
      Sentry.captureException(error)
    })
    res.status(500).json({ message: 'Internal server error', error: error.message || error })
  } finally {
    if (emoteSetId) {
      await deleteEmoteSet(client, emoteSetId)
    }
  }
}

export default withMethods(['GET'], handler)
