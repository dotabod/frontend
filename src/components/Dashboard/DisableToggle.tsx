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
    <div className={clsx('mx-2 space-y-2 rounded p-4 transition-colors')}>
      <Tooltip
        placement="bottom"
        title={CommandDetail.commandDisable.description}
      >
        <div
          className={clsx(
            collapsed ? 'justify-center' : 'text-center',
            'flex items-center space-x-2'
          )}
        >
          <Switch
            loading={loading}
            className="flex"
            checked={!isDotabodDisabled}
            onChange={(checked) => updateSetting(!checked)}
          />
          <span
            className={clsx(
              'text-sm text-dark-300',
              collapsed && 'flex flex-col items-center'
            )}
          >
            <span>Dotabod</span>
            <span className={clsx(collapsed && 'hidden')}> is </span>
            <span>{isDotabodDisabled ? 'disabled' : 'enabled'}</span>
          </span>
        </div>
      </Tooltip>
    </div>
  )
}
