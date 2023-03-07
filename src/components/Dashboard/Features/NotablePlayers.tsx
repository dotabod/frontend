import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Settings } from '@/lib/defaultSettings'
import { Switch } from 'antd'
import React from 'react'
import Image from 'next/image'
import clsx from 'clsx'

export default function NotablePlayersCard() {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.notablePlayersOverlay)

  const { data: showFlags, updateSetting: showFlagsUpdate } = useUpdateSetting(
    Settings.notablePlayersOverlayFlags
  )
  const { data: showFlagsCmd, updateSetting: showFlagsCmdUpdate } =
    useUpdateSetting(Settings.notablePlayersOverlayFlagsCmd)

  return (
    <Card>
      <div className="title">
        <h3>Notable players</h3>
      </div>
      <div className="subtitle mb-2">
        Show notable players for 2 minutes under the hero top bar.
      </div>
      <div className={clsx('pt-4 pb-12 transition-all')}>
        <div className="flex flex-col items-start space-y-2 md:space-y-3">
          <div className="flex items-center">
            <Switch checked={isEnabled} onChange={updateSetting} />
            <span className="ml-2 text-sm text-gray-300">
              Enable overlay under hero top bar
            </span>
          </div>
          <div
            className={clsx('flex items-center', !isEnabled && 'opacity-40')}
          >
            <Switch
              disabled={!isEnabled}
              checked={showFlags}
              onChange={showFlagsUpdate}
            />
            <span className="ml-2 text-sm text-gray-300">
              Show country flags in overlay
            </span>
          </div>
          <div
            className={clsx('flex items-center', !isEnabled && 'opacity-40')}
          >
            <Switch
              disabled={!isEnabled}
              checked={showFlagsCmd}
              onChange={showFlagsCmdUpdate}
            />
            <span className="ml-2 text-sm text-gray-300">
              Show country flags in !np twitch chat command
            </span>
          </div>
        </div>
      </div>
      <div
        className={clsx(
          'flex flex-col items-center space-y-4 transition-all',
          !isEnabled && 'opacity-40'
        )}
      >
        <Image
          className={clsx(
            'rounded-xl border-2 border-transparent transition-all'
          )}
          alt="minimap blocker"
          width={413}
          height={50}
          src={`/images/dashboard/notable-players.png`}
        />
        <span>Players with their country flags</span>
      </div>
    </Card>
  )
}
