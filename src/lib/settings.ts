import type { ChatterSettingKeys } from '@/utils/subscription'
import type { SettingKeys } from './defaultSettings'
import { defaultSettings } from './defaultSettings'

type Setting = {
  key: string
  value: unknown
}

export function getValueOrDefault(
  key: SettingKeys | ChatterSettingKeys | undefined,
  settings?: Setting[]
): unknown {
  if (!key) return undefined

  // Handle chatter settings
  if (key.startsWith('chatters.')) {
    const chattersData = settings?.find((s) => s.key === 'chatters')
    const chatterKey = key.split('.')[1]
    return (
      chattersData?.value?.[chatterKey]?.enabled ??
      defaultSettings.chatters[chatterKey].enabled
    )
  }

  // Handle regular settings
  const setting = settings?.find((s) => s.key === key)
  return setting?.value ?? defaultSettings[key]
}
