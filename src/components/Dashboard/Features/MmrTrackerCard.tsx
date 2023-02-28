import Image from 'next/image'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch, Tooltip } from 'antd'
import React from 'react'
import { Settings } from '@/lib/defaultSettings'
import { MMRBadge } from '@/components/Overlay/rank/MMRBadge'
import clsx from 'clsx'
import MmrForm from './MmrForm'

export default function MmrTrackerCard() {
  const { data: isEnabled, updateSetting } = useUpdateSetting(
    Settings['mmr-tracker']
  )

  const { data: onlyParty, updateSetting: updateOnlyParty } = useUpdateSetting(
    Settings.onlyParty
  )

  const { data: tellChatNewMMR, updateSetting: updateChatNewMmr } =
    useUpdateSetting(Settings.tellChatNewMMR)

  const { data: showRankMmr, updateSetting: updateHideMmr } = useUpdateSetting(
    Settings.showRankMmr
  )

  const { data: showRankImage, updateSetting: updateHideRankImage } =
    useUpdateSetting(Settings.showRankImage)

  const { data: showRankLeader, updateSetting: updateHideRankLeader } =
    useUpdateSetting(Settings.showRankLeader)

  return (
    <Card>
      <div className="title">
        <h3>MMR tracker</h3>
      </div>
      <div className="subtitle">
        Give or take {onlyParty ? 20 : 30} MMR after every ranked match.
      </div>
      <div>A list of accounts will show below as you play on them.</div>

      <div className={clsx('py-4 transition-all')}>
        <div className="flex flex-col items-start space-y-2 md:space-y-3">
          <div className="flex items-center space-x-2">
            <Switch checked={isEnabled} onChange={updateSetting} />
            <span>Update mmr with every match</span>
          </div>

          <div>
            <Tooltip
              placement="bottom"
              title="When you win/lose a match or change your mmr manually"
              className="flex items-center space-x-2"
            >
              <Switch checked={tellChatNewMMR} onChange={updateChatNewMmr} />
              <span>Tell chat anytime mmr changes</span>
            </Tooltip>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={showRankMmr} onChange={updateHideMmr} />
            <span>Show MMR</span>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={showRankLeader} onChange={updateHideRankLeader} />
            <span>Show leaderboard ranking</span>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={showRankImage} onChange={updateHideRankImage} />
            <span>Show rank badge</span>
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

      <MmrForm />

      <div className="my-6 flex justify-center space-x-4">
        <MMRBadge
          leaderboard={null}
          image={showRankImage ? '11.png' : null}
          rank={showRankMmr ? '130' : null}
          className="self-center !rounded-md bg-transparent"
        />
        <MMRBadge
          leaderboard={showRankLeader ? '1' : null}
          image={showRankImage ? '92.png' : null}
          rank={showRankMmr ? '13150' : null}
          className="self-center !rounded-md bg-transparent"
        />
      </div>

      <div className={clsx('transition-all')}>
        <div className="flex flex-col items-center space-y-4">
          <Image
            alt="mmr tracker"
            width={534}
            height={82}
            src="/images/dashboard/mmr-tracker.png"
          />
          <span>Correct badge and MMR shown next to shop button</span>
        </div>
      </div>
    </Card>
  )
}
