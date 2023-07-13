import { RoshCounter } from '@/components/Overlay/rosh/RoshCounter'
import { Settings } from '@/lib/defaultSettings'
import { isDev } from '@/lib/devConsts'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

interface AnimateRoshProps {
  block: any
  roshan: {
    minS: number
    count: number
    maxS: number
  }
  paused: boolean
  onComplete: () => void
}

export const AnimateRosh = ({
  onComplete,
  paused,
  block,
  roshan: { count, maxS, minS },
}: AnimateRoshProps) => {
  const props = {
    color: minS ? 'red' : 'yellow',
    count,
    duration: minS || maxS,
    onComplete,
    paused,
  }

  const { data: isEnabled } = useUpdateSetting(Settings.rosh)

  if (!isEnabled || (block.type !== 'playing' && !isDev)) {
    return null
  }

  return (
    <div>
      {/*We have to create two counters, because the other one doesn't start unless the first one is unmounted */}
      {minS ? <RoshCounter {...props} /> : null}
      {!minS && maxS ? <RoshCounter {...props} /> : null}
    </div>
  )
}
