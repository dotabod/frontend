import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { Card } from '@/ui/card'
import { Display, Image } from '@geist-ui/core'
import { Checkbox, Switch } from '@mantine/core'
import clsx from 'clsx'
import { Settings } from '@/lib/defaultSettings'

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
        Block your minimap to deter people from farming your wards.
      </div>
      <div
        className={clsx(
          'flex flex-col items-center',
          !isEnabled && 'opacity-40'
        )}
      >
        <Display
          shadow
          caption="Semi-transparent blocker that auto places itself over your minimap"
        >
          <Image
            alt="minimap blocker"
            height={minimapXl ? `280px` : `240px`}
            src={`/images/overlay/minimap/731-${
              minimapSimple ? 'Simple' : 'Complex'
            }-${minimapXl ? 'X' : ''}Large-AntiStreamSnipeMap.png`}
            style={{
              backgroundImage:
                "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUAQMAAAC3R49OAAAABlBMVEX////09PQtDxrOAAAAE0lEQVQI12P4f4CBKMxg/4EYDAAFkR1NiYvv7QAAAABJRU5ErkJggg==')",
            }}
          />
        </Display>
      </div>
      <Card.Footer className={clsx(!isEnabled && 'opacity-40')}>
        <div className="flex flex-col items-start space-y-2 md:space-y-1">
          <Checkbox
            label="Use simple minimap background"
            disabled={!isEnabled}
            checked={minimapSimple}
            value={Settings['minimap-simple']}
            onChange={(e) => updateSimple(!!e?.target?.checked)}
          />

          <Checkbox
            label="Use extra large minimap"
            disabled={!isEnabled}
            checked={minimapXl}
            value={Settings['minimap-xl']}
            onChange={(e) => updateXl(!!e?.target?.checked)}
          />
          <Checkbox
            label="Show minimap on the right"
            disabled={!isEnabled}
            checked={isMinimapRight}
            value={Settings.minimapRight}
            onChange={(e) => updateMinimapRight(!!e?.target?.checked)}
          />

          <Checkbox
            label="Use Battlepass 2022 HUD"
            disabled={!isEnabled}
            checked={isBP}
            value={Settings.battlepass}
            onChange={(e) => updateBP(!!e?.target?.checked)}
          />
        </div>
      </Card.Footer>
    </Card>
  )
}
