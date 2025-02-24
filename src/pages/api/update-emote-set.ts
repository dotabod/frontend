import { emotesRequired } from '@/components/Dashboard/ChatBot'
import type { EmoteSetResponse } from '@/lib/7tv'
import { get7TVUser, getOrCreateEmoteSet } from '@/lib/7tv'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { CHANGE_EMOTE_IN_SET, GET_EMOTE_SET_FOR_CARD, UPDATE_USER_CONNECTION } from '@/lib/gql'
import { canAccessFeature, getSubscription } from '@/utils/subscription'
import { GraphQLClient } from 'graphql-request'
import type { NextApiRequest, NextApiResponse } from 'next'

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

  try {
    const client = new GraphQLClient('https://7tv.io/v3/gql', {
      headers: {
        Cookie: `seventv-auth=${process.env.SEVENTV_AUTH}`,
      },
    })

    const stvResponse = await get7TVUser(twitchId)

    try {
      const result = await getOrCreateEmoteSet({
        client,
        userId: stvResponse.user.id,
        twitchId,
        name: 'DotabodEmotes',
      })

      console.log('Checking existing emotes in the emote set...')
      const userEmoteSet = (await client.request(GET_EMOTE_SET_FOR_CARD, {
        id: result.emoteSetId,
        limit: 100,
      })) as EmoteSetResponse
      if (!userEmoteSet) {
        throw new Error('Emote set not found')
      }

      const existingEmoteNames = userEmoteSet.emoteSet.emotes.map((e) => e.name)
      const emotesAlreadyInSet = emotesRequired.every((emote) =>
        existingEmoteNames.includes(emote.label),
      )

      if (emotesAlreadyInSet) {
        const activeConnection = userEmoteSet.emoteSet.owner?.connections?.find(
          (c) => c.id === twitchId,
        )
        if (!activeConnection) {
          await client.request(UPDATE_USER_CONNECTION, {
            id: stvResponse.user.id,
            conn_id: `${twitchId}`,
            d: { emote_set_id: result.emoteSetId },
          })
          console.log('Updated user connection')
        }
        return res.status(200).json({ message: 'Emote set already updated' })
      }

      console.log('Adding emotes to emote set...')
      const failedEmotes: Array<{ name: string; error: unknown }> = []
      await Promise.all(
        emotesRequired.map(async (emote) => {
          try {
            console.log(`Adding emote ${emote.label}...`)
            await client.request(CHANGE_EMOTE_IN_SET, {
              id: result.emoteSetId,
              action: 'ADD',
              name: emote.label,
              emote_id: emote.id,
            })
            console.log(`Successfully added emote ${emote.label}`)
          } catch (error) {
            console.error(`Error adding emote ${emote.label}:`, error)
            failedEmotes.push({ name: emote.label, error })
          }
        }),
      )
      console.log('Verifying emote set update...')

      const updatedEmoteSet = (await client.request(GET_EMOTE_SET_FOR_CARD, {
        id: result.emoteSetId,
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
          message: 'Failed to add some emotes',
          missingEmotes,
          failedEmotes: failedEmotes.map((f) => ({ name: f.name, error: String(f.error) })),
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
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

export default withMethods(['GET'], withAuthentication(handler))
