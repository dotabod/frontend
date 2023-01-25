import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Center, Switch } from '@mantine/core'
import clsx from 'clsx'
import { Settings } from '@/lib/defaultSettings'
import Image from 'next/image'

export default function PicksCard() {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings['picks-blocker'])

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
      <Center>
        <div
          className={clsx(
            'mt-6 flex flex-col items-center space-y-12 transition-all',
            !isEnabled && 'opacity-40'
          )}
        >
          <div className="flex flex-col items-center space-y-4">
            <Image
              className={clsx(
                'rounded-xl border-2 border-transparent transition-all'
              )}
              alt="picks blocker"
              width={600}
              height={600}
              src="/images/overlay/picks/block-radiant-picks.png"
            />
            <span>Picks blocker</span>
          </div>
        </div>
      </Center>
    </Card>
  )
}
