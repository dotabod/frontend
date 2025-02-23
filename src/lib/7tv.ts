import { GraphQLClient } from 'graphql-request'
import {
  CREATE_EMOTE_SET,
  GET_EMOTE_SET_FOR_CARD,
  GET_USER_EMOTE_SETS,
  UPDATE_USER_CONNECTION,
} from './gql'

export type EmoteSetResponse = {
  emoteSet: {
    emote_count: number
    capacity: number
    flags: number
    name: string
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

export type UserEmoteSetsResponse = {
  user: {
    emote_sets: Array<{
      id: string
      name: string
      owner?: {
        connections?: Array<{
          id: string
        }>
      }
    }>
  }
}

export type SevenTVErrorResponse = {
  response: {
    errors: Array<{
      message: string
      extensions: {
        code: string
      }
    }>
  }
}

export function isSevenTVError(error: unknown): error is SevenTVErrorResponse {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as { response?: unknown }
  if (!maybeError.response || typeof maybeError.response !== 'object') return false

  const maybeResponse = maybeError.response as { errors?: unknown }
  return Array.isArray(maybeResponse.errors)
}

export async function get7TVUser(twitchId: string) {
  const response = await fetch(`https://7tv.io/v3/users/twitch/${twitchId}?cacheBust=${Date.now()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch user data: ${response.statusText}`)
  }
  const stvResponse = await response.json()
  if (!stvResponse?.user?.id) {
    throw new Error('7tv user not found')
  }
  return stvResponse
}

export async function getOrCreateEmoteSet({
  client,
  userId,
  twitchId,
  name,
}: {
  client: GraphQLClient
  userId: string
  twitchId: string
  name: string
}): Promise<{ emoteSetId: string; created: boolean }> {
  try {
    // Check for existing emote sets first
    const data: UserEmoteSetsResponse = await client.request(GET_USER_EMOTE_SETS, {
      id: userId,
    })

    // Find the emote set that has the twitch connection
    const existingEmoteSet = data?.user?.emote_sets?.find(
      (es) =>
        es.owner?.connections?.find(
          (c) => Number.parseInt(c.id, 10) === Number.parseInt(twitchId, 10),
        ) !== undefined,
    )

    // Get the existing set details to check its name
    if (existingEmoteSet?.id && existingEmoteSet.name !== 'Personal Emotes') {
      return { emoteSetId: existingEmoteSet.id, created: false }
    }

    // Create new set if no existing set or if existing is Personal Emotes
    const createEmoteSetResult = (await client.request(CREATE_EMOTE_SET, {
      user_id: userId,
      data: { name },
    })) as { createEmoteSet: { id: string } }

    const emoteSetId = createEmoteSetResult.createEmoteSet.id

    // Update the connection to use this emote set
    await client.request(UPDATE_USER_CONNECTION, {
      id: userId,
      conn_id: `${twitchId}`,
      d: { emote_set_id: emoteSetId },
    })

    return { emoteSetId, created: true }
  } catch (error) {
    if (
      isSevenTVError(error) &&
      error.response.errors[0]?.extensions?.code === 'LACKING_PRIVILEGES'
    ) {
      throw new Error('User does not have permission to use personal emote sets')
    }
    throw error
  }
}

export async function verifyEmoteInSet(
  client: GraphQLClient,
  emoteSetId: string,
  emoteName: string,
) {
  console.log(`Verifying emote ${emoteName} in set ${emoteSetId}...`)
  const userEmoteSet = (await client.request(GET_EMOTE_SET_FOR_CARD, {
    id: emoteSetId,
    limit: 20,
  })) as EmoteSetResponse

  if (!userEmoteSet?.emoteSet) {
    throw new Error('Emote set not found')
  }

  console.log(
    'Current emotes in set:',
    userEmoteSet.emoteSet.emotes.map((e) => e.name),
  )
  const emote = userEmoteSet.emoteSet.emotes.find((e) => e.name === emoteName)
  if (!emote) {
    throw new Error(`Emote ${emoteName} not found in set`)
  }

  return userEmoteSet
}

export function create7TVClient(authToken?: string) {
  if (!authToken) {
    throw new Error('No 7TV auth token provided')
  }

  return new GraphQLClient('https://7tv.io/v3/gql', {
    headers: {
      Cookie: `seventv-auth=${authToken}`,
    },
  })
}
