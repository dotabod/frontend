import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Tag } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { TierBadge } from './TierBadge'
import { TierSlider } from './TierSlider'
import { TierSwitch } from './TierSwitch'

export default function MinimapCard(): React.ReactNode {
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

  // Handle opacity changes from the slider
  const handleOpacityChange = (value: number) => {
    setLocalOpacity(value)
  }

  // Get description text based on opacity value
  const getOpacityDescription = () => {
    if (localOpacity >= 0.95) {
      return 'Maximum protection: Minimap completely hidden from viewers'
    }
    if (localOpacity >= 0.75) {
      return 'High protection: Most minimap details are hidden from viewers'
    }
    if (localOpacity >= 0.5) {
      return 'Medium protection: Some minimap details visible but wards are hidden'
    }
    if (localOpacity >= 0.25) {
      return "Optimal setting: Chat can see hero positions but snipers can't see wards"
    }
    return 'Low protection: Minimap is mostly visible to viewers'
  }

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
      <div className='mb-6'>
        <TierSlider
          settingKey={Settings['minimap-opacity']}
          min={0}
          max={1}
          step={0.05}
          label={
            <span className='flex items-center gap-2'>
              Blocker intensity
              <Tag color='green'>New</Tag>
            </span>
          }
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
            style={{ opacity: localOpacity }}
            alt='minimap blocker'
            width={minimapXl ? 280 : 240}
            height={minimapXl ? 280 : 240}
            src={`/images/overlay/minimap/738-${'Simple'}-${
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
