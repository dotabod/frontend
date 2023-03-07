import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch } from 'antd'
import clsx from 'clsx'
import { Settings } from '@/lib/defaultSettings'
import Image from 'next/image'

export default function MinimapCard(): JSX.Element {
  const {
    data: isEnabled,
    loading: l0,
    updateSetting,
  } = useUpdateSetting(Settings['minimap-blocker'])
  const {
    data: minimapSimple,
    loading: l1,
    updateSetting: updateSimple,
  } = useUpdateSetting(Settings['minimap-simple'])
  const {
    data: minimapXl,
    loading: l2,
    updateSetting: updateXl,
  } = useUpdateSetting(Settings['minimap-xl'])
  const {
    data: isBP,
    loading: l3,
    updateSetting: updateBP,
  } = useUpdateSetting(Settings.battlepass)
  const {
    data: isMinimapRight,
    loading: l4,
    updateSetting: updateMinimapRight,
  } = useUpdateSetting(Settings.minimapRight)

  const switches = [
    {
      loading: l0,
      checked: isEnabled,
      onChange: updateSetting,
      label: 'Enable minimap blocker',
    },
    {
      loading: l1,
      checked: minimapSimple,
      onChange: updateSimple,
      label: 'Simple minimap background',
    },
    {
      loading: l2,
      checked: minimapXl,
      onChange: updateXl,
      label: 'Extra large minimap',
    },
    {
      loading: l4,
      checked: isMinimapRight,
      onChange: updateMinimapRight,
      label: 'Right side minimap',
    },
    {
      loading: l3,
      checked: isBP,
      onChange: updateBP,
      label: 'Battlepass hud',
    },
  ]

  return (
    <Card>
      <div className="title">
        <h3>Minimap</h3>
      </div>
      <div className="subtitle">
        Semi-transparent blocker that auto places itself over your minimap to
        deter people from farming your wards.
      </div>
      <div className={clsx('pt-4 pb-12 transition-all')}>
        <div className="flex flex-col items-start space-y-2 md:space-y-3">
          {switches.map(({ loading, checked, onChange, label }, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Switch checked={checked} loading={loading} onChange={onChange} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={clsx(
          'flex w-full items-center justify-center space-x-4 transition-all',
          !isEnabled && 'opacity-40'
        )}
      >
        <div className="flex flex-col items-center space-y-4">
          <Image
            className={clsx(
              !minimapSimple && 'border-2 border-blue-600',
              minimapSimple && 'opacity-60',
              'rounded-xl border-2 border-transparent transition-all'
            )}
            alt="minimap blocker"
            width={minimapXl ? 280 : 240}
            height={minimapXl ? 280 : 240}
            src={`/images/overlay/minimap/731-${'Complex'}-${
              minimapXl ? 'X' : ''
            }Large-AntiStreamSnipeMap.png`}
          />
          <span>Complex minimap</span>
        </div>
        <div className="flex flex-col items-center space-y-4">
          <Image
            className={clsx(
              minimapSimple && 'border border-2 border-blue-600',
              !minimapSimple && 'opacity-60',
              'rounded-xl border-2 border-transparent transition-all'
            )}
            alt="minimap blocker"
            width={minimapXl ? 280 : 240}
            height={minimapXl ? 280 : 240}
            src={`/images/overlay/minimap/731-${'Simple'}-${
              minimapXl ? 'X' : ''
            }Large-AntiStreamSnipeMap.png`}
          />
          <span>Simple minimap</span>
        </div>
      </div>
    </Card>
  )
}
