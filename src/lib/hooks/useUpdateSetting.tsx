import { type SettingKeys, Settings } from '@/lib/defaultSettings'
import { App } from 'antd'
import { useRouter } from 'next/router'
import useSWR, { type MutatorOptions, useSWRConfig } from 'swr'
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
  const { data, error } = useSWR(path, fetcher)
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
    if (newValue === true) isNow = 'enabled'
    if (newValue === false) isNow = 'disabled'

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

export function useUpdateSetting(key?: SettingKeys) {
  const router = useRouter()

  // This is only used to get user settings from the OBS overlay
  const { userId } = router.query

  // Only create the URL if userId is available or not expected
  const url = userId
    ? `/api/settings?id=${userId}`
    : router.pathname.includes('/overlay')
      ? null
      : '/api/settings'

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

      // find the key in data, then update the value to be new
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

  const updateSetting = (newValue) => {
    if (!url) return
    update({ value: newValue }, `/api/settings/${key}`)
  }

  return {
    data: value,
    original: data,
    error,
    loading,
    updateSetting,
    mutate: () => url && mutate(url),
  }
}

export function useGetSettings() {
  const router = useRouter()

  // This is only used to get user settings from the OBS overlay
  const { userId } = router.query
  const url = userId
    ? `/api/settings?id=${userId}`
    : router.pathname.includes('/overlay')
      ? null
      : '/api/settings'
  const { data, loading } = useUpdate({ path: url })
  return { data, loading }
}

export function useGetSettingsByUsername() {
  const router = useRouter()

  const { username } = router.query
  const url = username ? `/api/settings?username=${username}` : null
  const { data, loading, error } = useUpdate({ path: url })

  // Return error information to make it easier to handle in the component
  return {
    data,
    loading,
    error,
    notFound: error && (error as any)?.status === 404,
  }
}
