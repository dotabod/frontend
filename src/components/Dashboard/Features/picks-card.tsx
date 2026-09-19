import { clsx } from 'clsx'
import Image from 'next/image'

import { Settings } from '@/lib/default-settings'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import { Card } from '@/ui/card'

import { TierSwitch } from './tier-switch'

const PicksCard = () => {
  const { data: isEnabled } = useUpdateSetting(Settings['picks-blocker'])

  return (
    <Card title='Picks' feature='picks-blocker'>
      <div className='mb-4 flex items-center space-x-2'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings['picks-blocker']}
          label='Enable pick blocker'
        />
      </div>
      <div className={clsx('transition-all', !isEnabled && 'opacity-40')}>
        <p>
          Covers picks until heroes can no longer be banned, then reveals your hero while hiding
          your teammates. The overlay disappears in strategy phase.
        </p>
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
          <span>Radiant picking phase</span>
        </div>
      </div>
    </Card>
  )
}

export default PicksCard
