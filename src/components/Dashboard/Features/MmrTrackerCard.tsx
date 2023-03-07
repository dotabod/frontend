import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch, Tooltip } from 'antd'
import React from 'react'
import { Settings } from '@/lib/defaultSettings'
import clsx from 'clsx'
import MmrForm from './MmrForm'

export default function MmrTrackerCard() {
  const { data: isEnabled, updateSetting } = useUpdateSetting(
    Settings['mmr-tracker']
  )

  const { data: onlyParty, updateSetting: updateOnlyParty } = useUpdateSetting(
    Settings.onlyParty
  )

  return (
    <Card>
      <div className="title">
        <h3>MMR tracker</h3>
      </div>
      <div className="subtitle">
        Give or take {onlyParty ? 20 : 30} MMR after every ranked match.
      </div>
      <div>A list of accounts will show below as you play on them.</div>

      <MmrForm />

      <div className={clsx('py-4 transition-all')}>
        <div className="flex flex-col items-start space-y-2 md:space-y-3">
          <div className="flex items-center space-x-2">
            <Switch checked={isEnabled} onChange={updateSetting} />
            <span>Update mmr with every match</span>
          </div>

          <Tooltip
            placement="bottom"
            title="Enable this to award 20 MMR instead of 30 for all matches. Disable to use 30 MMR again."
          >
            <div
              className={clsx(
                'mt-5 flex w-fit items-center space-x-2 transition-all'
              )}
            >
              <div className="flex items-center space-x-2">
                <Switch checked={onlyParty} onChange={updateOnlyParty} />
                <span>Party queue only</span>
              </div>
            </div>
          </Tooltip>
        </div>
      </div>
    </Card>
  )
}
