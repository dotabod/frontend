import { defaultSettings, SettingKeys } from '@/lib/defaultSettings'

export const getValueOrDefault = (
  key: SettingKeys,
  data?: { key: string; value: any }[]
) => {
  if (!Array.isArray(data) || !data.length || !data.filter(Boolean).length) {
    return defaultSettings[key]
  }

  const dbVal = data?.find((s) => s.key === key)?.value

  // Undefined is not touching the option in FE yet
  // So we give them our best default
  if (dbVal === undefined) {
    return defaultSettings[key]
  }

  try {
    if (typeof dbVal === 'string') {
      const val = JSON.parse(dbVal) as unknown as any
      if (typeof val === 'object' && typeof defaultSettings[key] === 'object') {
        return {
          ...(defaultSettings[key] as any),
          ...val,
        }
      }

      return val
    }

    if (typeof dbVal === 'object' && typeof defaultSettings[key] === 'object') {
      return {
        ...(defaultSettings[key] as any),
        ...dbVal,
      }
    }

    return dbVal
  } catch {
    return dbVal
  }
}
