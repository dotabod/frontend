import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import { GraphQLClient, gql } from 'graphql-request'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

const UPDATE_EMOTE_SET = gql`
  mutation UpdateEmoteSet($id: ObjectID!, $data: UpdateEmoteSetInput!) {
    emoteSet(id: $id) {
      update(data: $data) {
        id
        name
        __typename
      }
      __typename
    }
  }
`

const CREATE_EMOTE_SET = gql`
  mutation CreateEmoteSet($user_id: ObjectID!, $data: CreateEmoteSetInput!) {
    createEmoteSet(user_id: $user_id, data: $data) {
      id
      name
      capacity
      owner {
        id
        display_name
        style {
          color
          __typename
        }
        avatar_url
        __typename
      }
      emotes {
        id
        name
        __typename
      }
      __typename
    }
  }
`

const UPDATE_USER_CONNECTION = gql`
  mutation UpdateUserConnection($id: ObjectID!, $conn_id: String!, $d: UserConnectionUpdate!) {
    user(id: $id) {
      connections(id: $conn_id, data: $d) {
        id
        platform
        display_name
        emote_set_id
        __typename
      }
      __typename
    }
  }
`

const GET_USER_EMOTE_SETS = gql`
  query GetUserEmoteSets($id: ObjectID!) {
    user(id: $id) {
      id
      emote_sets {
        id
        name
        flags
        capacity
        emote_count
        origins {
          id
          weight
          __typename
        }
        owner {
          id
          display_name
          style {
            color
            __typename
          }
          avatar_url
          connections {
            id
            emote_capacity
            emote_set_id
            platform
            display_name
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }
`

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
