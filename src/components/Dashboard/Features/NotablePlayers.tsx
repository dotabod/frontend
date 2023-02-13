import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Settings } from '@/lib/defaultSettings'
import { Tag, Switch } from 'antd'
import React from 'react'
import Image from 'next/image'
import clsx from 'clsx'

export default function NotablePlayersCard() {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.notablePlayersOverlay)

  return (
    <Card>
      <div className="title">
        <h3>
          Notable players <Tag>beta</Tag>
        </h3>
        <Switch checked={isEnabled} onChange={updateSetting} />
      </div>
      <div className="subtitle mb-2">
        Show notable players for 2 minutes under the hero top bar.
      </div>
      <div className="flex flex-col items-center space-y-4">
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
