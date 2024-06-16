import { MMRBadge } from '@/components/Overlay/rank/MMRBadge'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'

export default function MmrOverlay() {
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
        <h3>Rank and mmr</h3>
      </div>
      <div className="subtitle">
        Wouldn&apos;t it be nice to show your friends how good you are?
      </div>

      <div className={clsx('py-4 transition-all')}>
        <div className="flex flex-col items-start space-y-2 md:space-y-3">
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
        </div>
      </div>

      <div className="my-6 flex justify-center space-x-4">
        <MMRBadge
          leaderboard={null}
          image={showRankImage ? '11.png' : null}
          rank={showRankMmr ? '130' : null}
          className="self-center !rounded-md bg-transparent"
          style={{ fontSize: 11 }}
        />
        <MMRBadge
          leaderboard={showRankLeader ? '1' : null}
          image={showRankImage ? '92.png' : null}
          rank={showRankMmr ? '13150' : null}
          className="self-center !rounded-md bg-transparent"
          style={{ fontSize: 11 }}
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
