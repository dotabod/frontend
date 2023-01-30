import useSWR, { MutatorOptions, useSWRConfig } from 'swr'
import { getValueOrDefault } from '../settings'
import { fetcher } from '../fetcher'
import { showNotification } from '@mantine/notifications'
import { SettingKeys, Settings } from '@/lib/defaultSettings'
import { useRouter } from 'next/router'

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
  const { data } = useSWR(path, fetcher)
  const { mutate } = useSWRConfig()

  const loading = data === undefined

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
      showNotification({
        title: response.ok ? 'Success' : 'Error',
        message: response.ok
          ? `Updated! Setting is now ${
              ['string', 'number'].includes(typeof isNow) ? isNow : 'updated'
            }`
          : 'Could not save your settings',
        color: response.ok ? 'green' : 'red',
      })

      return dataTransform(data, newValue)
    }

    mutate(path, updateFn(data), options)
  }

  return { data, loading, updateSetting, mutate }
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
  const url = `/api/settings${userId ? `?id=${userId}` : ''}`

  const {
    data,
    mutate,
    loading,
    updateSetting: update,
  } = useUpdate({
    path: url,
    dataTransform: (data, newValue) => {
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
    update({ value: newValue }, `/api/settings/${key}`)
  }

  return { data: value, loading, updateSetting, mutate: () => mutate(url) }
}

export function useGetSettings() {
  const router = useRouter()

  // This is only used to get user settings from the OBS overlay
  const { userId } = router.query
  const url = `/api/settings${userId ? `?id=${userId}` : ''}`
  const { data, loading } = useUpdate({ path: url })
  return { data, loading }
}
