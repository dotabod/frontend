import clsx from 'clsx'
import Image from 'next/image'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { TierSwitch } from './TierSwitch'

export default function RoshCard() {
  const { data: hasAegis } = useUpdateSetting(Settings.aegis)
  const { data: hasRosh } = useUpdateSetting(Settings.rosh)

  return (
    <Card title='Roshan timers' feature='rosh'>
      <div className='subtitle'>
        Dotabod can detect when roshan is killed or aegis is picked up.
      </div>

      <div className={clsx('py-4 transition-all')}>
        <div className='flex flex-col items-start space-y-2 md:space-y-3'>
          <div className='flex items-center'>
            <TierSwitch hideTierBadge settingKey={Settings.rosh} label='Roshan timer' />
          </div>
          <div className='flex items-center'>
            <TierSwitch hideTierBadge settingKey={Settings.aegis} label='Aegis timer' />
          </div>
          <div className='flex items-center'>
            <TierSwitch
              hideTierBadge
              settingKey={Settings['minimap-xl']}
              label='Use extra large minimap'
            />
          </div>
        </div>
      </div>

      <div className='space-y-2 text-sm text-gray-300'>
        <p>
          Sadly the data does not tell us when someone dies with aegis, so the aegis icon will
          remain for the full 5 minutes.
        </p>
        <p>
          The rosh timer starts red for 8 minutes (min rosh spawn), then turns yellow for 3 minutes
          (max rosh spawn).
        </p>
      </div>
      <div className='my-2 flex items-center justify-center space-x-4'>
        <div className='flex flex-col items-center space-y-4'>
          <Image
            alt='aegis timer'
            width={372}
            height={141}
            src='/images/dashboard/just-aegis-timer.png'
            className={clsx('inline rounded-sm transition-all', !hasAegis && 'opacity-40')}
          />
          <span>Aegis timer</span>
        </div>
        <div className='flex flex-col items-center space-y-4'>
          <Image
            alt='rosh timer'
            width={336}
            height={249}
            src='/images/dashboard/rosh-timer.png'
            className={clsx('inline rounded-sm transition-all', !hasRosh && 'opacity-40')}
          />
          <span>Roshan timer</span>
        </div>
      </div>
    </Card>
  )
}
