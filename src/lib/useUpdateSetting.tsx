import { useToasts } from '@geist-ui/core'
import useSWR, { useSWRConfig } from 'swr'
import { useDebouncedCallback } from 'use-debounce'
import { DBSettings, getValueOrDefault } from './DBSettings'
import { fetcher } from './fetcher'

export function useUpdateSetting(key) {
  const { data } = useSWR(`/api/settings`, fetcher)

  const loading = data === undefined
  let isEnabled = getValueOrDefault(data?.settings, key)
  if (key === DBSettings.mmr) isEnabled = data?.mmr || 0

  const { setToast } = useToasts()
  const { mutate } = useSWRConfig()

  const updateSetting = useDebouncedCallback((value) => {
    const setting = { ...data, value }
    const options = {
      optimisticData: setting,
      rollbackOnError: true,
    }

    let isNow = setting.value
    if (setting.value === true) isNow = 'enabled'
    if (setting.value === false) isNow = 'disabled'

    const updateFn = async (setting) => {
      const response = await fetch(`/api/settings/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ value: setting.value }),
      })
      setToast({
        text: response.ok
          ? `Updated! Setting is now ${isNow}`
          : 'Error updating',
        type: response.ok ? 'success' : 'error',
      })

      const newData =
        (Array.isArray(data?.settings) &&
          data?.settings.filter((k) => k !== key)) ||
        []
      newData.push(setting)
      return newData
    }

    mutate(`/api/settings`, updateFn(setting), options)
  }, 400)

  return { isEnabled, loading, updateSetting }
}
