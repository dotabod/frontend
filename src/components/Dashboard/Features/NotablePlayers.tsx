import clsx from 'clsx'
import Image from 'next/image'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { TierSwitch } from './TierSwitch'

export default function NotablePlayersCard() {
  const { data: isEnabled } = useUpdateSetting(Settings.notablePlayersOverlay)

  return (
    <Card title='Notable players' feature='notablePlayersOverlay'>
      <div className='subtitle'>Show notable players for 2 minutes under the hero top bar.</div>
      <div className={clsx('pb-12 pt-4 transition-all')}>
        <div className='flex flex-col items-start space-y-2 md:space-y-3'>
          <div className='flex items-center'>
            <TierSwitch
              hideTierBadge
              settingKey={Settings.notablePlayersOverlay}
              label='Enable overlay under hero top bar'
            />
          </div>
          <div className={clsx('flex items-center', !isEnabled && 'opacity-40')}>
            <TierSwitch
              hideTierBadge
              settingKey={Settings.notablePlayersOverlayFlags}
              label='Show country flags in overlay'
            />
          </div>
          <div className={clsx('flex items-center', !isEnabled && 'opacity-40')}>
            <TierSwitch
              hideTierBadge
              settingKey={Settings.notablePlayersOverlayFlagsCmd}
              label='Show country flags in !np twitch chat command'
            />
          </div>
        </div>
      </div>
      <div
        className={clsx(
          'flex flex-col items-center space-y-4 transition-all',
          !isEnabled && 'opacity-40',
        )}
      >
        <Image
          className={clsx('rounded-xl border-2 border-transparent transition-all')}
          alt='minimap blocker'
          width={413}
          height={50}
          src={'/images/dashboard/notable-players.png'}
        />
        <span>Players with their country flags</span>
      </div>
    </Card>
  )
}
