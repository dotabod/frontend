import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import clsx from 'clsx'
import Image from 'next/image'
import { TierSwitch } from '../Dashboard/Features/TierSwitch'

export default function BetsOverlay() {
  const { data: showLivePolls } = useUpdateSetting(Settings.livePolls)

  return (
    <Card title='Twitch predictions' feature='livePolls'>
      <div className='subtitle'>Let your chatters bet on your matches.</div>
      <div>
        Chatters can use their native Twitch channel points to bet on whether you win or lose a
        match.
      </div>
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
        className={clsx(!showLivePolls && 'opacity-40', 'scale-90 rounded shadow')}
      />
    </Card>
  )
}
