import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import React from 'react'
import { Switch, Tooltip } from 'antd'
import CommandDetail from '@/components/Dashboard/CommandDetail'

export function DisableToggle() {
  const {
    data: isDotabodDisabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.commandDisable)

  return (
    <Tooltip placement="right" title={CommandDetail.commandDisable.description}>
      <label
        htmlFor="disable-toggle"
        className="cursor-pointer space-x-2 rounded text-xs "
      >
        <Switch
          id="disable-toggle"
          loading={loading}
          size="small"
          className="flex"
          checked={!isDotabodDisabled}
          onChange={(checked) => updateSetting(!checked)}
        />
        <span>Dotabod is {isDotabodDisabled ? 'disabled' : 'enabled'}</span>
      </label>
    </Tooltip>
  )
}
