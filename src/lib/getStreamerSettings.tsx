import { Settings, defaultSettings } from '@/lib/defaultSettings'
import { getValueOrDefault } from '@/lib/settings'

export const getStreamerSettings = (data) => {
  const opts = defaultSettings

  // Replace defaults with settings from DB
  Object.values(Settings).forEach((key) => {
    // @ts-ignore ||?
    opts[key] = getValueOrDefault(key, data?.settings)
  })
  return opts
}
