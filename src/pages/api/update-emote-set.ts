import { GraphQLClient } from 'graphql-request'
import type { NextApiRequest, NextApiResponse } from 'next'
import { emotesRequired } from '@/components/Dashboard/ChatBot'
import type { EmoteSetResponse, SevenTVUserResponse } from '@/lib/7tv'
import { get7TVUser } from '@/lib/7tv'
import { getServerSession } from '@/lib/api/getServerSession'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import { CHANGE_EMOTE_IN_SET, GET_EMOTE_SET_FOR_CARD } from '@/lib/gql'
import { canAccessFeature, getSubscription } from '@/utils/subscription'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const subscription = await getSubscription(session.user.id)
  const { hasAccess } = canAccessFeature('auto7TV', subscription)

  if (!hasAccess) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const twitchId = session?.user?.twitchId

  if (!twitchId) {
    return res.status(400).json({ message: 'Twitch ID is required' })
  }

  // Check if emotesRequired is defined and not empty
  if (!emotesRequired || emotesRequired.length === 0) {
    return res.status(400).json({ message: 'No emotes defined for addition' })
  }

  try {
    const client = new GraphQLClient('https://7tv.io/v3/gql', {
      headers: {
        Cookie: `seventv-auth=${process.env.SEVENTV_AUTH}`,
      },
    })

    // Check if SEVENTV_AUTH environment variable is set
    if (!process.env.SEVENTV_AUTH) {
      console.error('SEVENTV_AUTH environment variable is not set')
      return res.status(500).json({ message: 'Server configuration error' })
    }

    // Check if twitchId exists
    if (!twitchId) {
      console.error('User does not have a Twitch ID')
      return res.status(400).json({ message: 'Twitch ID not found for user' })
    }

    let stvResponse: SevenTVUserResponse | null = null
    try {
      stvResponse = await get7TVUser(twitchId)
    } catch {
      return res.status(404).json({ message: '7TV user not found' })
    }

    // Check if stvResponse is valid
    if (!stvResponse?.user) {
      console.error('Failed to get 7TV user:', stvResponse)
      return res.status(404).json({ message: '7TV user not found' })
    }

    try {
      // Add to the channel's active set. Creating and assigning a separate set changes the
      // Streamer's visible 7TV emotes.
      const activeEmoteSetId = stvResponse.emote_set?.id

      if (!activeEmoteSetId) {
        console.error('7TV user does not have an active emote set:', stvResponse)
        return res.status(400).json({ message: 'No active 7TV emote set found' })
      }

      console.log('Checking existing emotes in the active emote set...')
      const userEmoteSet = (await client.request(GET_EMOTE_SET_FOR_CARD, {
        id: activeEmoteSetId,
        limit: 100,
      })) as EmoteSetResponse
      if (!userEmoteSet) {
        throw new Error('Emote set not found')
      }

      const existingEmoteNames = new Set(userEmoteSet.emoteSet.emotes.map((e) => e.name))
      const emotesAlreadyInSet = emotesRequired.every((emote) =>
        existingEmoteNames.has(emote.label),
      )

      if (emotesAlreadyInSet) {
        return res.status(200).json({ message: 'Emote set already updated' })
      }

      console.log('Adding emotes to emote set...')
      const failedEmotes: { name: string; error: unknown }[] = []
      await Promise.all(
        emotesRequired.map(async (emote, _index) => {
          try {
            console.log(`Adding emote ${emote.label}...`)
            await client.request(CHANGE_EMOTE_IN_SET, {
              action: 'ADD',
              emote_id: emote.id,
              id: activeEmoteSetId,
              name: emote.label,
            })
            console.log(`Successfully added emote ${emote.label}`)
          } catch (error) {
            console.error(`Error adding emote ${emote.label}:`, error)
            failedEmotes.push({ error, name: emote.label })
          }
        }),
      )
      console.log('Verifying emote set update...')

      const updatedEmoteSet = (await client.request(GET_EMOTE_SET_FOR_CARD, {
        id: activeEmoteSetId,
        limit: 100,
      })) as EmoteSetResponse
      if (!updatedEmoteSet) {
        throw new Error('Emote set not found')
      }

      const missingEmotes: string[] = []
      for (const emote of emotesRequired) {
        const emoteInSet = updatedEmoteSet.emoteSet.emotes.find((e) => e.name === emote.label)
        if (!emoteInSet) {
          missingEmotes.push(emote.label)
        }
      }

      if (missingEmotes.length > 0) {
        console.error('Failed to add emotes:', missingEmotes)
        console.error('Failed emote details:', failedEmotes)
        return res.status(500).json({
          failedEmotes: failedEmotes.map((f) => ({
            error: String(f.error),
            name: f.name,
          })),
          message: 'Failed to add some emotes',
          missingEmotes,
        })
      }

      console.log('Emote set update verified successfully')
      return res.status(200).json({ message: 'Emote set updated successfully' })
    } catch (error) {
      if (error instanceof Error && error.message) {
        return res.status(403).json({ message: error.message })
      }
      throw error
    }
  } catch (error) {
    console.error('Error:', error)
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    return res.status(500).json({
      error: errorMessage,
      message: 'Internal server error',
      stack: process.env.VERCEL_ENV !== 'production' ? errorStack : undefined,
    })
  }
}

export default withMethods(['GET'], withAuthentication(handler))
