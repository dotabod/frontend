import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import CommandDetail from '@/components/Dashboard/CommandDetail'
import React from 'react'
import clsx from 'clsx'
import { Switch } from '@mantine/core'

export function DisableToggle({ collapsed }: { collapsed: boolean }) {
  const {
    data: isDotabodDisabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.commandDisable)

  return (
    <div
      className={clsx(
        'mx-2 mt-10 space-y-2 rounded border-2 p-4 transition-colors',
        collapsed && 'border-0',
        isDotabodDisabled
          ? 'border-red-900/50 hover:border-red-700'
          : 'border-green-900/50 hover:border-green-700'
      )}
    >
      <div
        className={clsx(
          collapsed ? 'justify-center' : 'text-center',
          'flex flex-col items-center'
        )}
      >
        <p
          className={clsx(
            'text-sm text-dark-300',
            collapsed && 'flex flex-col items-center'
          )}
        >
          <span>Dotabod</span>
          <span className={clsx(collapsed && 'hidden')}> is </span>
          <span>{isDotabodDisabled ? 'disabled' : 'enabled'}</span>
        </p>

        {loading && (
          <Switch
            disabled
            size={collapsed ? 'sm' : 'lg'}
            className="flex"
            color={isDotabodDisabled ? 'red' : 'green'}
          />
        )}
        {!loading && (
          <Switch
            size={collapsed ? 'lg' : 'lg'}
            className="flex"
            color={isDotabodDisabled ? 'red' : 'green'}
            defaultChecked={isDotabodDisabled}
            onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
          >
            !mmr
          </Switch>
        )}
      </div>
      <p
        className={clsx(
          collapsed && 'hidden',
          'max-w-48 text-center text-xs text-dark-400'
        )}
      >
        {CommandDetail.commandDisable.description}
      </p>
    </div>
  )
}
