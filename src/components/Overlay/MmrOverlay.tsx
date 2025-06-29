import clsx from 'clsx'
import Image from 'next/image'
import { MMRBadge } from '@/components/Overlay/rank/MMRBadge'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { TierSwitch } from '../Dashboard/Features/TierSwitch'

export default function MmrOverlay() {
  const { data: showRankMmr } = useUpdateSetting(Settings.showRankMmr)
  const { data: showRankImage } = useUpdateSetting(Settings.showRankImage)
  const { data: showRankLeader } = useUpdateSetting(Settings.showRankLeader)

  return (
    <Card title='Rank and mmr'>
      <div className='subtitle'>
        Wouldn&apos;t it be nice to show your friends how good you are?
      </div>

      <div className={clsx('py-4 transition-all')}>
        <div className='flex flex-col items-start space-y-2 md:space-y-3'>
          <div className='flex items-center space-x-2'>
            <TierSwitch settingKey={Settings.showRankMmr} label='Show MMR' />
          </div>

          <div className='flex items-center space-x-2'>
            <TierSwitch settingKey={Settings.showRankLeader} label='Show leaderboard ranking' />
          </div>

          <div className='flex items-center space-x-2'>
            <TierSwitch settingKey={Settings.showRankImage} label='Show rank badge' />
          </div>
        </div>
      </div>

      <div className='my-6 flex justify-center space-x-4'>
        <MMRBadge
          leaderboard={null}
          image={showRankImage ? '11.png' : null}
          rank={showRankMmr ? 130 : undefined}
        />
        <MMRBadge
          leaderboard={showRankLeader ? 1 : undefined}
          image={showRankImage ? '92.png' : null}
          rank={showRankMmr ? 13150 : undefined}
        />
      </div>

      <div className={clsx('transition-all')}>
        <div className='flex flex-col items-center space-y-4'>
          <Image
            alt='mmr tracker'
            width={534}
            height={82}
            src='/images/dashboard/mmr-tracker.png'
          />
          <span>Correct badge and MMR shown next to shop button</span>
        </div>
      </div>
    </Card>
  )
}
