import { useToasts } from '@geist-ui/core'
import { SteamAccount } from '@prisma/client'
import useSWR, { useSWRConfig } from 'swr'
import { DBSettings, getValueOrDefault } from './DBSettings'
import { fetcher } from './fetcher'

export function useUpdateAccount() {
  const { data } = useSWR(`/api/settings/accounts`, fetcher)

  const loading = data === undefined

  const { setToast } = useToasts()
  const { mutate } = useSWRConfig()

  const update = (accounts: SteamAccount[]) => {
    const options = {
      optimisticData: { accounts },
      rollbackOnError: true,
    }

    const updateFn = async (accounts) => {
      const response = await fetch(`/api/settings/accounts`, {
        method: 'PATCH',
        body: JSON.stringify(accounts),
      })
      setToast({
        text: response.ok ? `Updated accounts!` : 'Error updating',
        type: response.ok ? 'success' : 'error',
      })

      return { accounts }
    }

    mutate(`/api/settings/accounts`, updateFn(accounts), options)
  }

  return { data, loading, update }
}

export function useUpdateSetting(key) {
  const { data } = useSWR(`/api/settings`, fetcher)
  const { setToast } = useToasts()
  const { mutate } = useSWRConfig()

  if (!key) return {}

  const loading = data === undefined
  let isEnabled = getValueOrDefault(data?.settings, key)
  if (key === DBSettings.mmr) isEnabled = data?.mmr || 0

  const updateSetting = (value) => {
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
  }

  return { isEnabled, loading, updateSetting }
}
