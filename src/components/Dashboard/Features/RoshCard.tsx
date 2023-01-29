import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch } from '@mantine/core'
import clsx from 'clsx'
import Image from 'next/image'
import { Settings } from '@/lib/defaultSettings'

export default function RoshCard() {
  const {
    data: hasAegis,
    loading: lA,
    updateSetting: uA,
  } = useUpdateSetting(Settings.aegis)
  const {
    data: hasRosh,
    loading: lR,
    updateSetting: uR,
  } = useUpdateSetting(Settings.rosh)
  const {
    data: minimapXl,
    loading: l2,
    updateSetting: updateXl,
  } = useUpdateSetting(Settings['minimap-xl'])

  return (
    <Card>
      <div className="title">
        <h3>Roshan timers</h3>
      </div>
      <div className="subtitle">
        Dotabod can detect when roshan is killed or aegis is picked up.
      </div>

      <div className={clsx('pt-4 pb-12 transition-all')}>
        <div className="flex flex-col items-start space-y-2 md:space-y-3">
          <Switch
            styles={{
              labelWrapper: {
                color: 'var(--mantine-color-dark-3)',
              },
            }}
            label="Enable roshan timer"
            checked={hasRosh}
            value={Settings.rosh}
            onChange={(e) => uR(!!e?.target?.checked)}
          />
          <Switch
            styles={{
              labelWrapper: {
                color: 'var(--mantine-color-dark-3)',
              },
            }}
            label="Enable aegis timer"
            checked={hasAegis}
            value={Settings.aegis}
            onChange={(e) => uA(!!e?.target?.checked)}
          />
          <Switch
            styles={{
              labelWrapper: {
                color: 'var(--mantine-color-dark-3)',
              },
            }}
            label="Use extra large minimap"
            checked={minimapXl}
            value={Settings['minimap-xl']}
            onChange={(e) => updateXl(!!e?.target?.checked)}
          />
        </div>
      </div>

      <div className="space-y-2 text-sm text-dark-300">
        <p>
          Sadly the data does not tell us when someone dies with aegis, so the
          aegis icon will remain for the full 5 minutes.
        </p>
        <p>
          The rosh timer starts red for 8 minutes (min rosh spawn), then turns
          yellow for 3 minutes (max rosh spawn).
        </p>
      </div>
      <div className="my-4 space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <Image
            alt="aegis timer"
            width={372}
            height={141}
            src="/images/dashboard/just-aegis-timer.png"
            className={clsx('inline transition-all', !hasAegis && 'opacity-40')}
          />
          <span>Aegis timer</span>
        </div>
        <div className="flex flex-col items-center space-y-4">
          <Image
            alt="rosh timer"
            width={336}
            height={249}
            src="/images/dashboard/rosh-timer.png"
            className={clsx('inline transition-all', !hasRosh && 'opacity-40')}
          />
          <span>Roshan timer</span>
        </div>
      </div>
    </Card>
  )
}
