import { clsx } from 'clsx'
import Image from 'next/image'

import { Settings } from '@/lib/default-settings'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import { Card } from '@/ui/card'

import { TierSwitch } from '../Dashboard/Features/tier-switch'

const BetsOverlay = () => {
  const { data: showLivePolls } = useUpdateSetting(Settings.livePolls)

  return (
    <Card title='Twitch predictions' feature='livePolls'>
      <div>Viewers use Twitch channel points to predict whether you win or lose.</div>
      <div className='mt-5 flex items-center space-x-2'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.livePolls}
          label='Show live betting / polls overlay'
        />
      </div>

      <Image
        src='https://i.imgur.com/Blo5rRr.png'
        alt='Live betting overlay'
        width={1070}
        height={436}
        className={clsx(!showLivePolls && 'opacity-40', 'scale-90 rounded-sm shadow-sm')}
      />
    </Card>
  )
}

export default BetsOverlay
