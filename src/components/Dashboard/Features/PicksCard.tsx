import clsx from 'clsx'
import Image from 'next/image'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { TierSwitch } from './TierSwitch'

export default function PicksCard() {
  const { data: isEnabled } = useUpdateSetting(Settings['picks-blocker'])

  return (
    <Card title='Picks' feature='picks-blocker'>
      <div className='subtitle'>Prevent stream snipers from seeing your picks.</div>
      <div className='mb-4 flex items-center space-x-2'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings['picks-blocker']}
          label='Enable pick blocker'
        />
      </div>
      <div className={clsx(' transition-all', !isEnabled && 'opacity-40')}>
        <p>
          There are several pick blocker overlays phases available. Dotabod intelligently auto
          chooses which one to show.
        </p>
        <ol className='ml-6 list-decimal'>
          <li>During hero picking phase, heroes are fully covered</li>
          <li>
            When you pick early, and it isn&apos;t locked in yet. While the enemy can still pick ban
            your pick. Heroes are fully covered
          </li>
          <li>
            When your hero is locked in and can no longer be banned. Your hero will be shown, but
            your teammate&apos;s heroes are still fully covered.
          </li>
          <li>When you enter strategy phase, the overlay is removed.</li>
        </ol>
      </div>

      <div
        className={clsx(
          'mt-6 flex flex-col items-center space-y-12 transition-all',
          !isEnabled && 'opacity-40',
        )}
      >
        <div className='flex flex-col items-center space-y-4'>
          <Image
            className={clsx('rounded-xl border-2 border-transparent transition-all')}
            alt='picks blocker'
            width={600}
            height={600}
            src='/images/overlay/picks/block-radiant-picks.png'
          />
          <span>Hero picking phase for radiant</span>
        </div>
      </div>
    </Card>
  )
}
