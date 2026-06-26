import type { SteamAccount, SubscriptionTier } from '@prisma/client'
import * as Sentry from '@sentry/nextjs'
import { App } from 'antd'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import useSWR, { type MutatorOptions, useSWRConfig } from 'swr'
import { useSubscription } from '@/hooks/useSubscription'
import { type SettingKeys, Settings } from '@/lib/defaultSettings'
import { type ChatterSettingKeys, canAccessFeature, type FeatureTier } from '@/utils/subscription'
import { fetcher } from '../fetcher'
import { getValueOrDefault } from '../settings'

function describeMutationFailure(status?: number): string {
  if (status === 403) return "You don't have permission to change this setting."
  if (status === 401) return "Couldn't save. Sign in again."
  if (status === 400 || status === 422) return "That setting can't be set to this value."
  if (status === 429) return "You're changing settings too quickly. Try again in a moment."
  if (status === undefined) return "Couldn't reach the server. Check your connection."
  return "Couldn't save. Try again in a moment."
}

interface UpdateProps {
  path?: string | null
  revalidate?: boolean
  dataTransform?: (data: unknown, newValue: unknown) => unknown
}

interface SettingEntry {
  key: string
  value: unknown
}

interface SettingsData {
  settings?: SettingEntry[]
  mmr?: number | null
  rankOnly?: RankOnlyInfo
  Account?: {
    providerAccountId?: string
  }
  SteamAccount?: {
    steam32Id: number
    mmr: number
    leaderboard_rank: number | null
  }[]
  stream_online?: boolean
  beta_tester?: boolean
  error?: unknown
  [key: string]: unknown
}

interface UserProfileData {
  displayName: string | null
  name: string
  stream_online: boolean
  image: string | null
  createdAt: string
  mmr?: number | null
  settings: SettingEntry[]
  error?: unknown
  [key: string]: unknown
}

interface MutationValue {
  value: unknown
}

type AccountMutationValue = Pick<
  SteamAccount,
  'steam32Id' | 'mmr' | 'name' | 'leaderboard_rank' | 'connectedUserIds'
> & {
  delete?: boolean
}

export const SETTINGS_SWR_OPTIONS = {
  dedupingInterval: 60_000,
  errorRetryCount: 1,
  errorRetryInterval: 30_000,
  focusThrottleInterval: 120_000,
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} as const

export const STABLE_SWR_OPTIONS = SETTINGS_SWR_OPTIONS

export const useUpdate = <
  TData extends Record<string, unknown> = Record<string, unknown>,
  TNewValue = unknown,
>({
  path,
  revalidate = false,
  dataTransform = (_data, newValue) => newValue as TData,
}: UpdateProps & {
  dataTransform?: (data: TData | undefined, newValue: TNewValue) => TData
}) => {
  const router = useRouter()
  const { data, error } = useSWR<TData>(router.isReady ? path : null, fetcher, {
    ...SETTINGS_SWR_OPTIONS,
    shouldRetryOnError(err) {
      if (err.status === 404 || err.status === 403) {
        return false
      }
      return true
    },
  })
  const { mutate } = useSWRConfig()
  const { message } = App.useApp()

  const [pendingCount, setPendingCount] = useState(0)
  const abortControllersRef = useRef<Set<AbortController>>(new Set())

  useEffect(() => {
    const controllers = abortControllersRef.current
    return () => {
      for (const controller of controllers) {
        controller.abort()
      }
      controllers.clear()
    }
  }, [])

  // Update loading logic to consider both data and error
  // This ensures loading becomes false when we get an error response
  const loading = data === undefined && !error
  const isSaving = pendingCount > 0

  const updateSetting = (newValue: TNewValue, customPath = '') => {
    const targetPath = customPath || path
    const cachePath = path || targetPath
    if (!targetPath) {
      return
    }

    const options: MutatorOptions = {
      optimisticData: dataTransform(data, newValue),
      revalidate,
      rollbackOnError: true,
    }

    const maybeEnabled = newValue as { enabled?: boolean } | undefined
    let isNow: string | number =
      typeof newValue === 'string' || typeof newValue === 'number' ? newValue : 'updated'
    if (newValue === true || maybeEnabled?.enabled === true) {
      isNow = 'enabled'
    }
    if (newValue === false || maybeEnabled?.enabled === false) {
      isNow = 'disabled'
    }

    const controller = new AbortController()
    abortControllersRef.current.add(controller)
    setPendingCount((n) => n + 1)

    const updateFn = async (currentData: TData | undefined) => {
      let response: Response | undefined
      try {
        response = await fetch(targetPath, {
          body: JSON.stringify(newValue),
          method: 'PATCH',
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Settings PATCH ${response.status}`)
        }
        message.open({
          content: `Success! Setting is now ${
            ['string', 'number'].includes(typeof isNow) ? isNow : 'updated'
          }`,
          type: 'success',
        })
        return dataTransform(currentData, newValue)
      } catch (err) {
        if (controller.signal.aborted) {
          // The request may have reached the server before unmount; keep the
          // optimistic value so SWR doesn't roll it back on the user.
          return dataTransform(currentData, newValue)
        }
        Sentry.captureException(err, {
          tags: { feature: 'settings-mutation' },
          extra: { path: targetPath, status: response?.status },
        })
        message.open({
          content: describeMutationFailure(response?.status),
          type: 'error',
        })
        throw err
      } finally {
        abortControllersRef.current.delete(controller)
        setPendingCount((n) => n - 1)
      }
    }

    mutate(cachePath, updateFn(data), options).catch(() => {
      // Failures are reported via Sentry + toast inside updateFn; swallow the
      // re-thrown rejection here so it doesn't surface as an unhandled rejection.
    })
  }

  return { data, error, loading, isSaving, mutate, updateSetting }
}

export function useUpdateAccount() {
  const { data, loading, isSaving, updateSetting } = useUpdate<
    { accounts?: SteamAccount[] },
    AccountMutationValue[]
  >({
    dataTransform: (data, newValue) => ({
      accounts:
        (newValue?.filter((a) => !a.delete) as SteamAccount[] | undefined) || data?.accounts,
    }),
    path: '/api/settings/accounts',
  })

  return { data, loading, isSaving, update: updateSetting }
}

export const useUpdateLocale = (props?: Omit<UpdateProps, 'dataTransform'>) => {
  const { data, loading, isSaving, updateSetting } = useUpdate<{ locale?: string }, string>({
    dataTransform: (data, newValue) => ({ locale: newValue || data?.locale }),
    path: '/api/settings/locale',
    ...props,
  })

  return { data, loading, isSaving, update: updateSetting }
}

// Define type for rankOnly settings
interface RankOnlyInfo {
  enabled: boolean
  minimumRank: string
  minimumRankTier: number
}

interface UpdateSettingResult<T = boolean> {
  data: T
  original: SettingsData
  error: unknown
  loading: boolean
  isSaving: boolean
  updateSetting: (newValue: T) => void
  mutate: () => void
  tierAccess: {
    hasAccess: boolean
    requiredTier: SubscriptionTier
  }
}

export function useUpdateSetting<T = boolean>(
  key?: SettingKeys | ChatterSettingKeys,
): UpdateSettingResult<T> {
  const router = useRouter()
  const { subscription } = useSubscription()

  // This is only used to get user settings from the OBS overlay
  const queryUserId = router.query.userId
  const userId = Array.isArray(queryUserId) ? queryUserId[0] : queryUserId
  const routeNeedsSettings =
    router.pathname.startsWith('/dashboard') || router.pathname.startsWith('/overlay')
  const url = userId
    ? `/api/settings?id=${userId}`
    : router.isReady && routeNeedsSettings
      ? '/api/settings'
      : null

  const {
    data,
    mutate,
    loading,
    isSaving,
    error,
    updateSetting: update,
  } = useUpdate<SettingsData, MutationValue>({
    dataTransform: (data, newValue) => {
      if (!data) {
        return {}
      }

      if (key === Settings.mmr) {
        return { ...data, mmr: newValue.value }
      }

      if (key === Settings.rankOnly) {
        return {
          ...data,
          rankOnly: {
            enabled: newValue.value.enabled,
            minimumRank: newValue.value.minimumRank,
            minimumRankTier: newValue.value.minimumRankTier,
          },
        }
      }

      // Handle chatter settings differently
      if (key?.startsWith('chatters.')) {
        const chattersData = data?.settings?.find((s) => s.key === Settings.chatters)
        return {
          ...data,
          settings: data?.settings?.map((setting) => {
            if (setting.key === Settings.chatters) {
              return {
                ...setting,
                // `newValue` is the MutationValue wrapper ({ value: { [chatterKey]: {enabled} } });
                // merge its inner payload, not the wrapper, so the toggled chatter actually
                // updates instead of landing under a stray `value` key.
                value: {
                  ...chattersData?.value,
                  ...(newValue.value as Record<string, unknown>),
                },
              }
            }
            return setting
          }),
        }
      }

      // Regular settings
      const newData =
        data?.settings?.map((setting) => {
          if (setting.key === key) {
            return { ...setting, ...newValue }
          }
          return setting
        }) || []

      if (!newData?.find((setting) => setting.key === key)) {
        newData.push({ key, ...newValue })
      }

      return { ...data, settings: newData }
    },
    path: url,
  })

  let value = getValueOrDefault(key, data?.settings)
  if (key === Settings.mmr) {
    value = data?.mmr || 0
  }
  // Chatter keys (`chatters.x`) are resolved by getValueOrDefault above, which falls back to
  // the real per-chatter default (on/off). Don't re-derive here with `?? false` — that showed
  // default-on chatters as off in dotted-key consumers (e.g. the What's New card).

  const tierAccess = canAccessFeature(key as FeatureTier, subscription)

  const updateSetting = (newValue: unknown) => {
    if (!tierAccess.hasAccess) {
      return
    }
    if (!url) {
      return
    }

    if (key?.startsWith('chatters.')) {
      const chatterKey = key.split('.')[1]
      update(
        { value: { [chatterKey]: { enabled: newValue } } },
        `/api/settings/${Settings.chatters}`,
      )
      return
    }

    if (key === Settings.rankOnly) {
      const rankInfo = newValue as RankOnlyInfo
      update(
        {
          value: {
            enabled: rankInfo.enabled,
            minimumRank: rankInfo.minimumRank,
            minimumRankTier: rankInfo.minimumRankTier,
          },
        },
        `/api/settings/${Settings.rankOnly}`,
      )
      return
    }

    update({ value: newValue }, `/api/settings/${key}`)
  }

  return {
    data: value as T,
    error,
    loading,
    isSaving,
    mutate: () => url && mutate(url),
    original: (data || {}) as SettingsData,
    tierAccess,
    updateSetting,
  }
}

export function useGetSettings() {
  const router = useRouter()

  // This is only used to get user settings from the OBS overlay
  const userId = typeof router.query.userId === 'string' ? router.query.userId : ''
  const url = `/api/settings${userId ? `?id=${userId}` : ''}`
  const { data, loading } = useUpdate<SettingsData>({ path: url })
  return { data, loading }
}

export function useGetSettingsByUsername() {
  const router = useRouter()

  const username = typeof router.query.username === 'string' ? router.query.username : ''
  const url = `/api/settings${username ? `?username=${username}` : ''}`
  const { data, loading, error } = useUpdate<UserProfileData>({ path: url })

  // Return error information to make it easier to handle in the component
  return {
    data,
    error,
    loading,
    notFound: error && (error as { status?: number })?.status === 404,
  }
}
