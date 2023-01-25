import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Center, Switch } from '@mantine/core'
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

  const loading = l0 || l1 || l2 || l3 || l4

  return (
    <Card>
      <div className="title">
        <h3>Minimap blocker</h3>
        {loading && <Switch disabled size="lg" color="blue" />}
        {!loading && (
          <Switch
            size="lg"
            onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            color="blue"
            defaultChecked={isEnabled}
          />
        )}
      </div>
      <div className="subtitle">
        Semi-transparent blocker that auto places itself over your minimap to
        deter people from farming your wards.
      </div>
      <div
        className={clsx(
          'pt-4 pb-12 transition-all',
          !isEnabled && 'opacity-40'
        )}
      >
        <div className="flex flex-col items-start space-y-2 md:space-y-3">
          <Switch
            styles={{
              labelWrapper: {
                color: 'var(--mantine-color-dark-3)',
              },
            }}
            label="Use simple minimap background"
            disabled={!isEnabled}
            color="blue"
            checked={minimapSimple}
            value={Settings['minimap-simple']}
            onChange={(e) => updateSimple(!!e?.target?.checked)}
          />

          <Switch
            styles={{
              labelWrapper: {
                color: 'var(--mantine-color-dark-3)',
              },
            }}
            label="Use extra large minimap"
            disabled={!isEnabled}
            checked={minimapXl}
            value={Settings['minimap-xl']}
            onChange={(e) => updateXl(!!e?.target?.checked)}
          />
          <Switch
            styles={{
              labelWrapper: {
                color: 'var(--mantine-color-dark-3)',
              },
            }}
            label="Show minimap on the right"
            disabled={!isEnabled}
            checked={isMinimapRight}
            value={Settings.minimapRight}
            onChange={(e) => updateMinimapRight(!!e?.target?.checked)}
          />

          <Switch
            styles={{
              labelWrapper: {
                color: 'var(--mantine-color-dark-3)',
              },
            }}
            label="Use Battlepass 2022 HUD"
            disabled={!isEnabled}
            checked={isBP}
            value={Settings.battlepass}
            onChange={(e) => updateBP(!!e?.target?.checked)}
          />
        </div>
      </div>

      <Center>
        <div
          className={clsx(
            'flex items-center space-x-4 transition-all',
            !isEnabled && 'opacity-40'
          )}
        >
          <div className="flex flex-col items-center space-y-4">
            <Image
              className={clsx(
                !minimapSimple && 'border border-2 border-blue-600',
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
      </Center>
    </Card>
  )
}
