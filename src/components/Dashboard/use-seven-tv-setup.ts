import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { z } from 'zod'

import { useFeatureAccess } from '@/hooks/use-subscription'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/use-update-setting'
import { useTrack } from '@/lib/track'

import { startSevenTvPolling } from './seven-tv-polling'

const sevenTvResponseSchema = z.object({
  emote_set: z
    .object({
      emotes: z.array(z.object({ id: z.string(), name: z.string() })).nullish(),
      id: z.string().nullish(),
    })
    .nullish(),
  user: z
    .object({
      editors: z.array(z.object({ id: z.string().nullish() })).nullish(),
      id: z.string().nullish(),
    })
    .nullish(),
})

export interface SevenTvUser {
  hasDotabodEditor: boolean
  hasDotabodEmoteSet: boolean
  id?: string
  personalSet?: string
}

export interface SevenTvEmote {
  id: string
  name: string
}

interface RequiredEmote {
  label: string
}

const EMPTY_EMOTES: SevenTvEmote[] = []

const areEmotesEqual = (current: SevenTvEmote[], next: SevenTvEmote[]) =>
  current.length === next.length &&
  current.every((emote, index) => emote.id === next[index]?.id && emote.name === next[index]?.name)

const areUsersEqual = (current: SevenTvUser | null, next: SevenTvUser) => {
  if (current === null) {
    return false
  }

  return [
    current.hasDotabodEditor === next.hasDotabodEditor,
    current.hasDotabodEmoteSet === next.hasDotabodEmoteSet,
    current.id === next.id,
    current.personalSet === next.personalSet,
  ].every(Boolean)
}

const getDisplayedUser = (
  hasTwitchId: boolean,
  updateEmoteSetError: Error | undefined,
  user: SevenTvUser | null,
) => {
  if (!hasTwitchId) {
    return null
  }
  if (updateEmoteSetError !== undefined && user !== null) {
    return { ...user, hasDotabodEmoteSet: false }
  }
  return user
}

const fetchSevenTvSetup = async (
  twitchId: string,
  requiredEmotes: RequiredEmote[],
  signal: AbortSignal,
) => {
  const response = await fetch(
    `https://7tv.io/v3/users/twitch/${encodeURIComponent(twitchId)}?cacheBust=${Date.now()}`,
    { signal },
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch 7TV user: ${response.status} ${response.statusText}`)
  }

  const data = sevenTvResponseSchema.parse(await response.json())
  const emotes = data.emote_set?.emotes ?? []
  const user = {
    hasDotabodEditor:
      data.user?.editors?.some(
        (editor) => editor.id?.toLowerCase() === '01GQZ0CEDR000AH5YBCSXQWR0V'.toLowerCase(),
      ) ?? false,
    hasDotabodEmoteSet: requiredEmotes.every((requiredEmote) =>
      emotes.some((emote) => emote.name === requiredEmote.label),
    ),
    id: data.user?.id ?? undefined,
    personalSet: data.emote_set?.id ?? undefined,
  }
  const shouldContinue = !(
    user.id !== undefined &&
    user.hasDotabodEditor &&
    user.hasDotabodEmoteSet
  )

  return { emotes, shouldContinue, user }
}

export const useSevenTvSetup = (requiredEmotes: RequiredEmote[]) => {
  const session = useSession()
  const [polledEmotes, setPolledEmotes] = useState<SevenTvEmote[]>([])
  const [polledUser, setPolledUser] = useState<SevenTvUser | null>(null)
  const [pollingLoading, setPollingLoading] = useState(true)
  const twitchId = session.data?.user?.twitchId?.trim()
  const hasTwitchId = twitchId !== undefined && twitchId.length > 0
  const track = useTrack()
  const { hasAccess: hasAuto7TVAccess } = useFeatureAccess('auto7TV')
  const updateEmoteSetKey =
    hasAuto7TVAccess && polledUser?.id !== undefined ? '/api/update-emote-set' : null
  const { error: updateEmoteSetError } = useSWR<unknown, Error>(
    updateEmoteSetKey,
    async (url: string) => {
      track('updateEmoteSet called')
      const response: unknown = await fetcher(url)
      return response
    },
    SETTINGS_SWR_OPTIONS,
  )
  const emotes = hasTwitchId ? polledEmotes : EMPTY_EMOTES
  const user = getDisplayedUser(hasTwitchId, updateEmoteSetError, polledUser)
  const loading =
    session.status === 'loading' ||
    (hasTwitchId && updateEmoteSetError === undefined && pollingLoading)

  useEffect(() => {
    let active = true
    let stopPolling: (() => void) | undefined

    if (hasTwitchId && updateEmoteSetError === undefined) {
      stopPolling = startSevenTvPolling({
        onError: (error) => {
          if (!active) {
            return
          }
          console.error('Error fetching user data:', error)
          setPollingLoading(false)
        },
        poll: async (signal) => {
          const result = await fetchSevenTvSetup(twitchId, requiredEmotes, signal)
          if (!active) {
            return false
          }
          if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError')
          }

          if (result.user.id !== undefined) {
            setPolledUser((currentUser) =>
              areUsersEqual(currentUser, result.user) ? currentUser : result.user,
            )
            setPolledEmotes((currentEmotes) =>
              areEmotesEqual(currentEmotes, result.emotes) ? currentEmotes : result.emotes,
            )
          }

          setPollingLoading(false)
          return result.shouldContinue
        },
      })
    }

    return () => {
      active = false
      stopPolling?.()
    }
  }, [hasTwitchId, requiredEmotes, twitchId, updateEmoteSetError])

  return { emotes, loading, updateEmoteSetError, user }
}
