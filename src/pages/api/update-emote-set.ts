import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import {
  CREATE_EMOTE_SET,
  GET_USER_EMOTE_SETS,
  UPDATE_EMOTE_SET,
  UPDATE_USER_CONNECTION,
} from '@/lib/gql'
import { GraphQLClient } from 'graphql-request'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const twitchId = session?.user?.twitchId

  try {
    // Step 1: Initialize GraphQL client
    const client = new GraphQLClient('https://7tv.io/v3/gql', {
      headers: {
        Cookie: `seventv-auth=${process.env.SEVENTV_AUTH}`,
      },
    })

    const response = await fetch(
      `https://7tv.io/v3/users/twitch/${twitchId}?cacheBust=${Date.now()}`
    )
    const stvResponse = await response.json()

    // Step 2: Fetch existing emote set data with GraphQL
    const getUserEmoteSetsVariables = {
      id: stvResponse?.user?.id,
    }

    const data: { user: { emote_sets: Array<any> } } = await client.request(
      GET_USER_EMOTE_SETS,
      getUserEmoteSetsVariables
    )
    const existingEmoteSet = data?.user?.emote_sets?.[0] || null
    const existingOrigins = existingEmoteSet?.origins || []
    const newOrigin = { id: '6685a8c5a3a3e500d5d42714', weight: 0 }

    if (existingOrigins.find((origin) => origin.id === newOrigin.id)) {
      return res.status(200).json({ message: 'Emote set already updated' })
    }

    let emoteSetId = existingEmoteSet?.id

    // Step 3: Create a new emote set if none exists
    if (!emoteSetId) {
      const createEmoteSetVariables = {
        user_id: stvResponse?.user?.id,
        data: { name: 'Dotabod Emotes' },
      }

      const createEmoteSetResult: {
        createEmoteSet: { id: string }
      } = await client.request(CREATE_EMOTE_SET, createEmoteSetVariables)
      emoteSetId = createEmoteSetResult.createEmoteSet.id
    }

    // Step 4: Update the user connection with the new emote set ID
    const updateUserConnectionVariables = {
      id: stvResponse?.user?.id,
      conn_id: twitchId,
      d: { emote_set_id: emoteSetId },
    }

    await client.request(UPDATE_USER_CONNECTION, updateUserConnectionVariables)

    // Step 5: Prepare the update data for the emote set
    const updatedOrigins = [...existingOrigins, newOrigin]
    const updateData = {
      name: existingEmoteSet?.name,
      capacity: existingEmoteSet?.capacity,
      origins: updatedOrigins,
    }

    const updateEmoteSetVariables = {
      id: emoteSetId,
      data: updateData,
    }

    const result = await client.request(
      UPDATE_EMOTE_SET,
      updateEmoteSetVariables
    )

    return res
      .status(200)
      .json({ message: 'Emote set updated successfully', result })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

export default withMethods(['GET'], withAuthentication(handler))
