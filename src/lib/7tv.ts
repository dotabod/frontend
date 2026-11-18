import { GraphQLClient, request } from 'graphql-request'

import { GET_USER_BY_TWITCH_ID } from '@/lib/gql'

const SEVENTV_GQL_URL = 'https://7tv.io/v3/gql'

export interface EmoteSetResponse {
  emoteSet: {
    emote_count: number
    capacity: number
    flags: number
    name: string
    owner?: {
      connections?: {
        id: string
        name: string
      }[]
    }
    emotes: {
      id: string
      name: string
      data: {
        id: string
        name: string
        host: {
          url: string
          files: {
            name: string
            format: string
          }[]
        }
      }
    }[]
  }
}

export interface SevenTVUserResponse {
  user?: {
    id: string
  }
  emote_set?: {
    id?: string
  }
}

export interface UserByTwitchIdResponse {
  userByConnection: {
    id: string
    connections: {
      id: string
      platform: string
      emote_set_id: string | null
    }[]
  } | null
}

// GraphQL rather than REST: 7TV's REST user endpoint has stalled for 20-40 seconds at a time,
// long enough to time out the routes that call this.
export const get7TVUser = async function get7TVUser(
  twitchId: string,
): Promise<SevenTVUserResponse> {
  const { userByConnection: user } = await request<UserByTwitchIdResponse>(
    SEVENTV_GQL_URL,
    GET_USER_BY_TWITCH_ID,
    { id: twitchId },
  )
  // 7TV answers an unknown Twitch ID with a placeholder user that has no connections.
  const twitch = user?.connections.find(
    (connection) => connection.platform === 'TWITCH' && connection.id === twitchId,
  )
  if (!user || !twitch) {
    throw new Error('7tv user not found')
  }
  return { emote_set: { id: twitch.emote_set_id ?? undefined }, user: { id: user.id } }
}

export const create7TVClient = function create7TVClient(authToken?: string) {
  if (!authToken) {
    throw new Error('No 7TV auth token provided')
  }

  return new GraphQLClient(SEVENTV_GQL_URL, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
}
