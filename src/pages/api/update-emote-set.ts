import { emotesRequired } from '@/components/Dashboard/ChatBot'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import {
  CHANGE_EMOTE_IN_SET,
  CREATE_EMOTE_SET,
  GET_EMOTE_SET_FOR_CARD,
  GET_USER_EMOTE_SETS,
  UPDATE_USER_CONNECTION,
} from '@/lib/gql'
import { GraphQLClient } from 'graphql-request'
import type { NextApiRequest, NextApiResponse } from 'next'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const twitchId = session?.user?.twitchId

  try {
    const client = new GraphQLClient('https://7tv.io/v3/gql', {
      headers: {
        Cookie: `seventv-auth=${process.env.SEVENTV_AUTH}`,
      },
    })

    const response = await fetch(
      `https://7tv.io/v3/users/twitch/${twitchId}?cacheBust=${Date.now()}`
    )
    const stvResponse = await response.json()

    if (!stvResponse?.user?.id) {
      throw new Error('7tv user not found')
    }

    const getUserEmoteSetsVariables = {
      id: stvResponse?.user?.id,
    }

    const data: { user: { emote_sets: Array<any> } } = await client.request(
      GET_USER_EMOTE_SETS,
      getUserEmoteSetsVariables
    )

    // Find the emote set that has the twitch connection
    const existingEmoteSet = data?.user?.emote_sets?.find(
      (es) =>
        es.owner?.connections?.find(
          (c) => Number.parseInt(c.id, 10) === Number.parseInt(twitchId, 10)
        ) !== undefined
    )
    let emoteSetId = stvResponse?.emote_set?.id || existingEmoteSet?.id

    if (!emoteSetId) {
      const createEmoteSetVariables = {
        user_id: stvResponse?.user?.id,
        data: { name: 'DotabodEmotes' },
      }

      const createEmoteSetResult: {
        createEmoteSet: { id: string }
      } = await client.request(CREATE_EMOTE_SET, createEmoteSetVariables)
      emoteSetId = createEmoteSetResult.createEmoteSet.id
    }

  const updateUserConnectionVariables = {
      id: stvResponse?.user?.id,
      conn_id: `${twitchId}`,
      d: { emote_set_id: emoteSetId },
    }

    await client.request(UPDATE_USER_CONNECTION, updateUserConnectionVariables)

    console.log('Checking existing emotes in the emote set...')
    const userEmoteSet = (await client.request(GET_EMOTE_SET_FOR_CARD, {
      id: emoteSetId,
      limit: 100,
    })) as {
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
    if (!userEmoteSet) {
      throw new Error('Emote set not found')
    }

    const existingEmoteNames = userEmoteSet.emoteSet.emotes.map((e) => e.name)
    const emotesAlreadyInSet = emotesRequired.every((emote) =>
      existingEmoteNames.includes(emote.label)
    )

    if (emotesAlreadyInSet) {
      return res.status(200).json({ message: 'Emote set already updated' })
    }

    console.log('Adding emotes to emote set...')
    for (const emote of emotesRequired) {
      try {
        await client.request(CHANGE_EMOTE_IN_SET, {
          id: emoteSetId,
          action: 'ADD',
          name: emote.label,
          emote_id: emote.id,
        })
      } catch (error) {
        // console.log(`Error adding emote ${emote.label}:`, error)
        // Do nothing, probably already added
      }
    }

    console.log('Verifying emote set update...')
    const updatedEmoteSet = (await client.request(GET_EMOTE_SET_FOR_CARD, {
      id: emoteSetId,
      limit: 100,
    })) as {
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
    if (!updatedEmoteSet) {
      throw new Error('Emote set not found')
    }

    for (const emote of emotesRequired) {
      const emoteInSet = updatedEmoteSet.emoteSet.emotes.find(
        (e) => e.name === emote.label
      )
      if (!emoteInSet) {
        throw new Error(`Emote ${emote.label} not found in set`)
      }
    }

    console.log('Emote set update verified successfully')
    return res.status(200).json({ message: 'Emote set updated successfully' })
  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

export default withMethods(['GET'], withAuthentication(handler))
