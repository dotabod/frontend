import { clsx } from 'clsx'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import { Settings } from '@/lib/default-settings'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import { Card } from '@/ui/card'

import { TierBadge } from './tier-badge'
import { TierSlider } from './tier-slider'
import { TierSwitch } from './tier-switch'

const MinimapCard = (): React.ReactNode => {
  const { data: isEnabled } = useUpdateSetting(Settings['minimap-blocker'])
  const { data: minimapSimple } = useUpdateSetting(Settings['minimap-simple'])
  const { data: minimapXl } = useUpdateSetting(Settings['minimap-xl'])
  const { data: minimapOpacity } = useUpdateSetting<number>(Settings['minimap-opacity'])

  // Local state for real-time opacity preview
  const [localOpacity, setLocalOpacity] = useState<number>(minimapOpacity ?? 1)

  // Update local opacity when the setting changes
  useEffect(() => {
    if (minimapOpacity !== undefined) {
      setLocalOpacity(minimapOpacity)
    }
  }, [minimapOpacity])

  const switches = [
    {
      label: 'Enable minimap blocker',
      settingKey: Settings['minimap-blocker'],
    },
    {
      label: 'Simple minimap background',
      settingKey: Settings['minimap-simple'],
    },
    {
      label: 'Extra large minimap',
      settingKey: Settings['minimap-xl'],
    },
    {
      label: 'Right side minimap',
      settingKey: Settings.minimapRight,
    },
    {
      label: 'Battlepass hud',
      settingKey: Settings.battlepass,
    },
  ]

  // Handle opacity changes from the slider
  const handleOpacityChange = (value: number) => {
    setLocalOpacity(value)
  }

  // Get description text based on opacity value
  const getOpacityDescription = () => {
    if (localOpacity >= 0.95) {
      return 'Minimap hidden'
    }
    if (localOpacity >= 0.8) {
      return 'Most minimap details hidden'
    }
    if (localOpacity >= 0.7) {
      return 'Hero positions visible; wards hidden'
    }
    if (localOpacity >= 0.5) {
      return 'Some minimap details visible; wards hidden'
    }
    return 'Most of the minimap visible'
  }

  return (
    <Card>
      <div className='title'>
        <h3>Minimap</h3>
      </div>
      <div className='subtitle'>
        Places a semi-transparent blocker over the minimap to hide wards from stream snipers.
      </div>
      <div className={clsx('pt-4 pb-12 transition-all')}>
        <div className='flex flex-col items-start space-y-2 md:space-y-3'>
          {switches.map((props) => (
            <TierSwitch key={props.settingKey} {...props} />
          ))}
        </div>
      </div>
      <div className='mb-6'>
        <TierSlider
          settingKey={Settings['minimap-opacity']}
          min={0}
          max={1}
          step={0.05}
          label={<span className='flex items-center gap-2'>Blocker intensity</span>}
          onChange={handleOpacityChange}
          helpText={getOpacityDescription()}
        />
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
            style={{ opacity: localOpacity }}
            alt='minimap blocker'
            width={minimapXl ? 280 : 240}
            height={minimapXl ? 280 : 240}
            src={`/images/overlay/minimap/741-Complex-${
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
            style={{ opacity: localOpacity }}
            alt='minimap blocker'
            width={minimapXl ? 280 : 240}
            height={minimapXl ? 280 : 240}
            src={`/images/overlay/minimap/741-Simple-${
              minimapXl ? 'X' : ''
            }Large-AntiStreamSnipeMap.png`}
          />
          <div className='flex items-center space-x-2'>
            <TierBadge feature='minimap-simple' />
            <span>Simple minimap</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default MinimapCard
