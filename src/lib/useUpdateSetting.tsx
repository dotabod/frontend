import useSWR, { useSWRConfig } from 'swr'
import { DBSettings, getValueOrDefault } from './DBSettings'
import { fetcher } from './fetcher'
import { showNotification } from '@mantine/notifications'

const useUpdate = (key, path, dataTransform = (data) => data) => {
  const { data } = useSWR(path, fetcher)
  const { mutate } = useSWRConfig()

  const loading = data === undefined
  let value = getValueOrDefault(data?.settings, key)
  if (key === DBSettings.mmr) value = data?.mmr || 0

  const updateSetting = (newValue) => {
    const options = {
      optimisticData: dataTransform({ ...data, value: newValue }),
      rollbackOnError: true,
    }

    let isNow = newValue
    if (newValue === true) isNow = 'enabled'
    if (newValue === false) isNow = 'disabled'

    const updateFn = async (data) => {
      const response = await fetch(`${path}${key ? `/${key}` : ''}`, {
        method: 'PATCH',
        body: JSON.stringify({ value: newValue }),
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

      return dataTransform(data)
    }

    mutate(path, updateFn(data), options)
  }

  return { data: key ? value : data, loading, updateSetting }
}

export function useUpdateAccount() {
  const { data, loading, updateSetting } = useUpdate(
    undefined,
    '/api/settings/accounts',
    (data) => ({ accounts: data })
  )

  return { data, loading, update: updateSetting }
}

export function useUpdateLocale() {
  const { data, loading, updateSetting } = useUpdate(
    undefined,
    '/api/settings/locale',
    (data) => ({ value: data })
  )

  return { data, loading, update: updateSetting }
}

export function useUpdateSetting(key) {
  return useUpdate(key, '/api/settings', (data) => data.settings)
}
