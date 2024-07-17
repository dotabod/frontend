import { withMethods } from '@/lib/api-middlewares/with-methods'
import {
  CREATE_EMOTE_SET,
  DELETE_EMOTE_SET,
  GET_USER_EMOTE_SETS,
  UPDATE_EMOTE_SET,
} from '@/lib/gql'
import * as Sentry from '@sentry/nextjs'
import { GraphQLClient } from 'graphql-request'
import type { NextApiRequest, NextApiResponse } from 'next'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req?.headers?.authorization
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
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

  try {
    const client = new GraphQLClient('https://7tv.io/v3/gql', {
      headers: {
        Cookie: `seventv-auth=${process.env.SEVENTV_AUTH}`,
      },
    })

    console.log('Fetching user data from 7tv...')
    const response = await fetch(
      `https://7tv.io/v3/users/twitch/${twitchId}?cacheBust=${Date.now()}`
    )
    const stvResponse = await response.json()
    const userId = stvResponse?.user?.id
    console.log('User ID:', userId)

    // Step 1: Create a new emote set
    console.log('Creating new emote set...')
    const createEmoteSetVariables = {
      user_id: userId,
      data: { name: 'Test Emote Set' },
    }
    const createEmoteSetResult = (await client.request(
      CREATE_EMOTE_SET,
      createEmoteSetVariables
    )) as { createEmoteSet: { id: string } }
    const emoteSetId = createEmoteSetResult.createEmoteSet.id
    console.log('Created emote set ID:', emoteSetId)

    // Step 2: Update the emote set with a new origin
    console.log('Updating emote set with new origin...')
    const newOrigin = { id: '6685a8c5a3a3e500d5d42714', weight: 0 }
    const updateData = {
      name: 'Test Emote Set',
      origins: [newOrigin],
    }
    const updateEmoteSetVariables = {
      id: emoteSetId,
      data: updateData,
    }
    await client.request(UPDATE_EMOTE_SET, updateEmoteSetVariables)
    console.log('Updated emote set with new origin:', newOrigin)

    // Step 3: Verify the update
    console.log('Verifying emote set update...')
    const getUserEmoteSetsVariables = { id: userId }
    const data = (await client.request(
      GET_USER_EMOTE_SETS,
      getUserEmoteSetsVariables
    )) as {
      user: {
        emote_sets: Array<{
          id: string
          name: string
          origins: Array<{ id: string }>
        }>
      }
    }
    const updatedEmoteSet = data.user.emote_sets.find(
      (set: any) => set.id === emoteSetId
    )
    const originExists = updatedEmoteSet?.origins.some(
      (origin: any) => origin.id === newOrigin.id
    )

    if (!originExists) {
      console.log('Origin update verification failed')
      throw new Error('Origin update verification failed')
    }
    console.log('Emote set update verified successfully')

    // Step 4: Delete the emote set
    console.log('Deleting emote set...')
    const deleteEmoteSetVariables = { id: emoteSetId }
    await client.request(DELETE_EMOTE_SET, deleteEmoteSetVariables)
    console.log('Deleted emote set ID:', emoteSetId)

    res.status(200).json({ message: 'Emote set test completed successfully' })
  } catch (error) {
    console.log('Error:', error)
    Sentry.withScope((scope) => {
      scope.setTag('test-related', 'true')
      scope.setContext('testDetails', {
        twitchId,
        userId: error?.userId || 'N/A',
        emoteSetId: error?.emoteSetId || 'N/A',
      })
      Sentry.captureException(error)
    })
    res.status(500).json({ message: 'Internal server error', error })
  }
}

export default withMethods(['GET'], handler)
