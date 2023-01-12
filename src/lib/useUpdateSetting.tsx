import useSWR, { MutatorOptions, useSWRConfig } from 'swr'
import { getValueOrDefault } from './settings'
import { fetcher } from './fetcher'
import { showNotification } from '@mantine/notifications'
import { SettingKeys, Settings } from '@/lib/defaultSettings'

export const useUpdate = (
  path,
  dataTransform = (data, newValue) => newValue
) => {
  const { data } = useSWR(path, fetcher)
  const { mutate } = useSWRConfig()

  const loading = data === undefined

  const updateSetting = (newValue, customPath = '') => {
    const options: MutatorOptions = {
      optimisticData: dataTransform(data, newValue),
      rollbackOnError: true,
      revalidate: false,
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

  return { data, loading, updateSetting }
}

export function useUpdateAccount() {
  const { data, loading, updateSetting } = useUpdate(
    '/api/settings/accounts',
    (data, newValue) => ({ accounts: newValue ?? data })
  )

  return { data, loading, update: updateSetting }
}

export function useUpdateLocale() {
  const { data, loading, updateSetting } = useUpdate(
    '/api/settings/locale',
    (data, newValue) => ({ value: newValue ?? data })
  )

  return { data, loading, update: updateSetting }
}

export function useUpdateSetting(key: SettingKeys) {
  const {
    data,
    loading,
    updateSetting: update,
  } = useUpdate(`/api/settings`, (data, newValue) => {
    // find the key in data, then update the value to be new
    const newData = data?.settings?.map((setting) => {
      if (setting.key === key) {
        return { ...setting, ...newValue }
      }
      return setting
    })

    if (!newData.find((setting) => setting.key === key)) {
      newData.push({ key, value: newValue })
    }

    return { ...data, settings: newData }
  })

  let value = getValueOrDefault(key, data?.settings)
  if (key === Settings.mmr) value = data?.mmr || 0

  const updateSetting = (newValue) => {
    update({ value: newValue }, `/api/settings/${key}`)
  }

  return { data: value, loading, updateSetting }
}
