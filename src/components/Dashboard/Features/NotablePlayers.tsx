import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Settings } from '@/lib/defaultSettings'
import { Badge, Switch } from '@mantine/core'
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
          Notable players <Badge>beta</Badge>
        </h3>
        <Switch
          styles={{
            labelWrapper: {
              color: 'var(--mantine-color-dark-3)',
            },
          }}
          size="lg"
          checked={isEnabled}
          value={Settings.notablePlayersOverlay}
          onChange={(e) => updateSetting(!!e?.target?.checked)}
        />
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
          width={584}
          height={75}
          src={`/images/dashboard/notable-players.png`}
        />
        <span>Simple minimap</span>
      </div>
    </Card>
  )
}
