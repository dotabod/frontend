import type { SubscriptionTier } from '@prisma/client'
import { App } from 'antd'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import useSWR, { type MutatorOptions, useSWRConfig } from 'swr'
import { useSubscription } from '@/hooks/useSubscription'
import { type SettingKeys, Settings } from '@/lib/defaultSettings'
import { type ChatterSettingKeys, canAccessFeature, type FeatureTier } from '@/utils/subscription'
import { fetcher } from '../fetcher'
import { getValueOrDefault } from '../settings'

interface UpdateProps {
  path?: any
  revalidate?: boolean
  dataTransform?: (data, newValue) => any
}

export const useUpdate = ({
  path,
  revalidate = false,
  dataTransform = (data, newValue) => newValue,
}: UpdateProps) => {
  const router = useRouter()
  const { data, error } = useSWR(router.isReady ? path : null, fetcher, {
    revalidateIfStale: false,
    shouldRetryOnError(err) {
      if (err.status === 404 || err.status === 403) {
        return false
      }
      return true
    },
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
  const { mutate } = useSWRConfig()
  const { message } = App.useApp()

  // Update loading logic to consider both data and error
  // This ensures loading becomes false when we get an error response
  const loading = data === undefined && !error

  const updateSetting = (newValue, customPath = '') => {
    const options: MutatorOptions = {
      optimisticData: dataTransform(data, newValue),
      rollbackOnError: true,
      revalidate,
    }

    let isNow = newValue
    if (newValue === true || newValue?.enabled === true) isNow = 'enabled'
    if (newValue === false || newValue?.enabled === false) isNow = 'disabled'

    const updateFn = async (data) => {
      const response = await fetch(customPath || path, {
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

      return dataTransform(data, newValue)
    }

    mutate(path, updateFn(data), options)
  }

  return { data, loading, updateSetting, mutate, error }
}

export function useUpdateAccount() {
  const { data, loading, updateSetting } = useUpdate({
    path: '/api/settings/accounts',
    dataTransform: (data, newValue) => ({
      accounts: newValue?.filter((a) => !a.delete) || data?.accounts,
    }),
  })

  return { data, loading, update: updateSetting }
}

export const useUpdateLocale = (props?: UpdateProps) => {
  const { data, loading, updateSetting } = useUpdate({
    path: '/api/settings/locale',
    dataTransform: (data, newValue) => ({ locale: newValue || data }),
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
  original: {
    beta_tester?: boolean
    settings?: Array<{
      key: string
      value: unknown
    }>
    SteamAccount?: {
      steam32Id: number
      mmr: number
      name: string | null
      leaderboard_rank: number | null
      connectedUserIds: string[]
    }
    stream_online?: boolean
    mmr?: number
  }
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
  const session = useSession()

  // This is only used to get user settings from the OBS overlay
  const { userId } = router.query
  const url = userId
    ? `/api/settings?id=${userId}`
    : session.data?.user?.id
      ? '/api/settings'
      : null

  const {
    data,
    mutate,
    loading,
    error,
    updateSetting: update,
  } = useUpdate({
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
    original: data || {},
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
  const { data, loading } = useUpdate({ path: url })
  return { data, loading }
}

export function useGetSettingsByUsername() {
  const router = useRouter()

  const { username } = router.query
  const url = `/api/settings${username ? `?username=${username}` : ''}`
  const { data, loading, error } = useUpdate({ path: url })

  // Return error information to make it easier to handle in the component
  return {
    data,
    loading,
    error,
    notFound: error && (error as any)?.status === 404,
  }
}
