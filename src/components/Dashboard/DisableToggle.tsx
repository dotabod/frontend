import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import React from 'react'
import { Switch } from 'antd'

export function DisableToggle() {
  const {
    data: isDotabodDisabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.commandDisable)

  return (
    <label
      htmlFor="disable-toggle"
      aria-disabled={true}
      className="cursor-not-allowed space-x-2 rounded text-xs text-gray-300"
    >
      <Switch
        id="disable-toggle"
        size="small"
        className="flex"
        checked={false}
        disabled
      />
      <span>Dotabod is disabled</span>
    </label>
  )
}
