import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import React from 'react'
import clsx from 'clsx'
import { Switch, Tooltip } from 'antd'
import CommandDetail from '@/components/Dashboard/CommandDetail'

export function DisableToggle({ collapsed }: { collapsed: boolean }) {
  const {
    data: isDotabodDisabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.commandDisable)

  return (
    <Tooltip
      className={clsx('mx-2 space-y-2 space-x-2 rounded p-4 transition-colors')}
      placement="right"
      title={CommandDetail.commandDisable.description}
    >
      <Switch
        loading={loading}
        className="flex"
        checked={!isDotabodDisabled}
        onChange={(checked) => updateSetting(!checked)}
      />
      <span
        className={clsx(
          'text-sm text-gray-300',
          collapsed && 'flex flex-col items-center'
        )}
      >
        <span>Dotabod</span>
        <span className={clsx(collapsed && 'hidden')}> is </span>
        <span>{isDotabodDisabled ? 'disabled' : 'enabled'}</span>
      </span>
    </Tooltip>
  )
}
