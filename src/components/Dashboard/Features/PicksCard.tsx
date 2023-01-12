import { DBSettings } from '@/lib/DBSettings'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { Card } from '@/ui/card'
import { Display, Image } from '@geist-ui/core'
import { Switch } from '@mantine/core'
import clsx from 'clsx'

export default function PicksCard() {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(DBSettings['picks-blocker'])

  return (
    <Card>
      <div className="title">
        <h3>Picks</h3>
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
        Prevent stream snipers from seeing your picks.
      </div>
      <div>
        Radiant blocker shown below as an example. The bot will pick the right
        overlay depending on which team you end up on.
      </div>
      <Display
        className={clsx(!isEnabled && 'opacity-40')}
        shadow
        caption="Picks blocker that auto places itself over your pick screen"
      >
        <Image
          alt="picks blocker"
          height="400px"
          src="/images/overlay/picks/block-radiant-picks.png"
          className="bg-gray-500"
          style={{
            backgroundImage:
              "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUAQMAAAC3R49OAAAABlBMVEX////09PQtDxrOAAAAE0lEQVQI12P4f4CBKMxg/4EYDAAFkR1NiYvv7QAAAABJRU5ErkJggg==')",
          }}
        />
      </Display>
    </Card>
  )
}
