import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Display } from '@geist-ui/core'
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

  return (
    <Card>
      <div className="title">
        <h3>Roshan timers</h3>

        <div className="flex space-x-4">
          {lA && <Switch disabled size="lg" color="blue" />}
          {!lA && (
            <Switch
              size="lg"
              onLabel="Aegis"
              offLabel="Aegis"
              onChange={(e) => uA(!!e?.currentTarget?.checked)}
              color="blue"
              defaultChecked={hasAegis}
            />
          )}
          {lR && <Switch disabled size="lg" color="blue" />}
          {!lR && (
            <Switch
              size="lg"
              onLabel="Rosh"
              offLabel="Rosh"
              onChange={(e) => uR(!!e?.currentTarget?.checked)}
              color="blue"
              defaultChecked={hasRosh}
            />
          )}
        </div>
      </div>
      <div className="subtitle">
        Dotabod can detect when roshan is killed or aegis is picked up.
      </div>
      <div className="space-y-2 text-sm text-dark-300">
        <p>
          Sadly the data does not tell us when someone dies with aegis, so{' '}
          <b>the aegis icon will remain for the full 5 minutes</b>.
        </p>
        <p>
          The rosh timer starts red for 8 minutes (min rosh spawn), then turns
          yellow for 3 minutes (max rosh spawn).
        </p>
      </div>
      <Display shadow caption="Aegis timer">
        <Image
          alt="aegis timer"
          width={372}
          height={141}
          src="/images/dashboard/just-aegis-timer.png"
          className={clsx('inline', !hasAegis && 'opacity-40')}
        />
      </Display>
      <Display shadow caption="Roshan timer">
        <Image
          alt="rosh timer"
          width={336}
          height={249}
          src="/images/dashboard/rosh-timer.png"
          className={clsx('inline', !hasRosh && 'opacity-40')}
        />
      </Display>
    </Card>
  )
}
