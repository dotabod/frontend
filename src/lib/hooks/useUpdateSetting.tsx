import type { SteamAccount, SubscriptionTier } from '@prisma/client'
import { App } from 'antd'
import { useRouter } from 'next/router'
import useSWR, { type MutatorOptions, useSWRConfig } from 'swr'
import { useSubscription } from '@/hooks/useSubscription'
import { type SettingKeys, Settings } from '@/lib/defaultSettings'
import { type ChatterSettingKeys, canAccessFeature, type FeatureTier } from '@/utils/subscription'
import { fetcher } from '../fetcher'
import { getValueOrDefault } from '../settings'

interface UpdateProps {
  path?: string | null
  revalidate?: boolean
  dataTransform?: (data: unknown, newValue: unknown) => unknown
}

type SettingEntry = {
  key: string
  value: unknown
}

type SettingsData = {
  settings?: SettingEntry[]
  mmr?: number | null
  rankOnly?: RankOnlyInfo
  Account?: {
    providerAccountId?: string
  }
  SteamAccount?: {
    steam32Id: number
    mmr: number
    name: string | null
    leaderboard_rank: number | null
    connectedUserIds: string[]
  }
  stream_online?: boolean
  beta_tester?: boolean
  error?: unknown
  [key: string]: unknown
}

type UserProfileData = {
  displayName: string | null
  name: string
  stream_online: boolean
  image: string | null
  createdAt: string
  mmr?: number | null
  settings: SettingEntry[]
  error?: unknown
}

type MutationValue = {
  value: unknown
}

type AccountMutationValue = Pick<
  SteamAccount,
  'steam32Id' | 'mmr' | 'name' | 'leaderboard_rank' | 'connectedUserIds'
> & {
  delete?: boolean
}

export const SETTINGS_SWR_OPTIONS = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000,
  focusThrottleInterval: 120000,
  errorRetryInterval: 30000,
  errorRetryCount: 1,
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

  // Update loading logic to consider both data and error
  // This ensures loading becomes false when we get an error response
  const loading = data === undefined && !error

  const updateSetting = (newValue: TNewValue, customPath = '') => {
    const targetPath = customPath || path
    if (!targetPath) return

    const options: MutatorOptions = {
      optimisticData: dataTransform(data, newValue),
      rollbackOnError: true,
      revalidate,
    }

    const maybeEnabled = newValue as { enabled?: boolean } | undefined
    let isNow: string | number =
      typeof newValue === 'string' || typeof newValue === 'number' ? newValue : 'updated'
    if (newValue === true || maybeEnabled?.enabled === true) isNow = 'enabled'
    if (newValue === false || maybeEnabled?.enabled === false) isNow = 'disabled'

    const updateFn = async (currentData: TData | undefined) => {
      const response = await fetch(targetPath, {
        method: 'PATCH',
        body: JSON.stringify(newValue),
      })
      message.open({
        type: response.ok ? 'success' : 'error',
        content: response.ok
          ? `Success! Setting is now ${
              ['string', 'number'].includes(typeof isNow) ? isNow : 'updated'
            }`
          : 'Could not save your settings',
      })

      return dataTransform(currentData, newValue)
    }

    mutate(targetPath, updateFn(data), options)
  }

  return { data, loading, updateSetting, mutate, error }
}

export function useUpdateAccount() {
  const { data, loading, updateSetting } = useUpdate<
    { accounts?: SteamAccount[] },
    Array<AccountMutationValue>
  >({
    path: '/api/settings/accounts',
    dataTransform: (data, newValue) => ({
      accounts:
        (newValue?.filter((a) => !a.delete) as SteamAccount[] | undefined) || data?.accounts,
    }),
  })

  return { data, loading, update: updateSetting }
}

export const useUpdateLocale = (props?: Omit<UpdateProps, 'dataTransform'>) => {
  const { data, loading, updateSetting } = useUpdate<{ locale?: string }, string>({
    path: '/api/settings/locale',
    dataTransform: (data, newValue) => ({ locale: newValue || data?.locale }),
    ...props,
  })

  return { data, loading, update: updateSetting }
}

// Define type for rankOnly settings
type RankOnlyInfo = {
  enabled: boolean
  minimumRank: string
  minimumRankTier: number
}

interface UpdateSettingResult<T = boolean> {
  data: T
  original: SettingsData
  error: unknown
  loading: boolean
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
    error,
    updateSetting: update,
  } = useUpdate<SettingsData, MutationValue>({
    path: url,
    dataTransform: (data, newValue) => {
      if (!data) return {}

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
                value: {
                  ...chattersData?.value,
                  ...newValue,
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
  })

  let value = getValueOrDefault(key, data?.settings)
  if (key === Settings.mmr) value = data?.mmr || 0
  if (key?.startsWith('chatters.')) {
    const chattersData = data?.settings?.find((s) => s.key === Settings.chatters)
    const chatterKey = key.split('.')[1]
    value = chattersData?.value?.[chatterKey]?.enabled ?? false
  }

  const tierAccess = canAccessFeature(key as FeatureTier, subscription)

  const updateSetting = (newValue: unknown) => {
    if (!tierAccess.hasAccess) return
    if (!url) return

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
    original: (data || {}) as SettingsData,
    error,
    loading,
    updateSetting,
    tierAccess,
    mutate: () => url && mutate(url),
  }
}

export function useGetSettings() {
  const router = useRouter()

  // This is only used to get user settings from the OBS overlay
  const { userId } = router.query
  const url = `/api/settings${userId ? `?id=${userId}` : ''}`
  const { data, loading } = useUpdate<SettingsData>({ path: url })
  return { data, loading }
}

export function useGetSettingsByUsername() {
  const router = useRouter()

  const { username } = router.query
  const url = `/api/settings${username ? `?username=${username}` : ''}`
  const { data, loading, error } = useUpdate<UserProfileData>({ path: url })

  // Return error information to make it easier to handle in the component
  return {
    data,
    loading,
    error,
    notFound: error && (error as { status?: number })?.status === 404,
  }
}
