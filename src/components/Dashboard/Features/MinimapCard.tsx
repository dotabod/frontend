import { Settings } from '@/lib/defaultSettings'
import { Card } from '@/ui/card'
import clsx from 'clsx'
import Image from 'next/image'
import { TierSwitch } from './TierSwitch'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

export default function MinimapCard(): JSX.Element {
  const { data: isEnabled } = useUpdateSetting(Settings['minimap-blocker'])
  const { data: minimapSimple } = useUpdateSetting(Settings['minimap-simple'])
  const { data: minimapXl } = useUpdateSetting(Settings['minimap-xl'])

  const switches = [
    {
      settingKey: Settings['minimap-blocker'],
      label: 'Enable minimap blocker',
    },
    {
      settingKey: Settings['minimap-simple'],
      label: 'Simple minimap background',
    },
    {
      settingKey: Settings['minimap-xl'],
      label: 'Extra large minimap',
    },
    {
      settingKey: Settings.minimapRight,
      label: 'Right side minimap',
    },
    {
      settingKey: Settings.battlepass,
      label: 'Battlepass hud',
    },
  ]

  return (
    <Card>
      <div className='title'>
        <h3>Minimap</h3>
      </div>
      <div className='subtitle'>
        Semi-transparent blocker that auto places itself over your minimap to deter people from
        farming your wards.
      </div>
      <div className={clsx('pb-12 pt-4 transition-all')}>
        <div className='flex flex-col items-start space-y-2 md:space-y-3'>
          {switches.map((props) => (
            <TierSwitch key={props.settingKey} {...props} />
          ))}
        </div>
      </div>

      <div
        className={clsx(
          'flex w-full items-center justify-center space-x-4 transition-all',
          !isEnabled && 'opacity-40',
        )}
      >
        <div className='flex flex-col items-center space-y-4'>
          <Image
            className={clsx(
              !minimapSimple && 'border-2 border-blue-600',
              minimapSimple && 'opacity-60',
              'rounded-xl border-2 border-transparent transition-all',
            )}
            alt='minimap blocker'
            width={minimapXl ? 280 : 240}
            height={minimapXl ? 280 : 240}
            src={`/images/overlay/minimap/738-${'Complex'}-${
              minimapXl ? 'X' : ''
            }Large-AntiStreamSnipeMap.png`}
          />
          <span>Complex minimap</span>
        </div>
        <div className='flex flex-col items-center space-y-4'>
          <Image
            className={clsx(
              minimapSimple && 'border border-2 border-blue-600',
              !minimapSimple && 'opacity-60',
              'rounded-xl border-2 border-transparent transition-all',
            )}
            alt='minimap blocker'
            width={minimapXl ? 280 : 240}
            height={minimapXl ? 280 : 240}
            src={`/images/overlay/minimap/738-${'Simple'}-${
              minimapXl ? 'X' : ''
            }Large-AntiStreamSnipeMap.png`}
          />
          <span>Simple minimap</span>
        </div>
      </div>
    </Card>
  )
}
