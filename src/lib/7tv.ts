import { GraphQLClient } from 'graphql-request'

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

export async function get7TVUser(twitchId: string) {
  const response = await fetch(`https://7tv.io/v3/users/twitch/${twitchId}?cacheBust=${Date.now()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch user data: ${response.statusText}`)
  }
  const stvResponse = (await response.json()) as SevenTVUserResponse
  if (!stvResponse?.user?.id) {
    throw new Error('7tv user not found')
  }
  return stvResponse
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
