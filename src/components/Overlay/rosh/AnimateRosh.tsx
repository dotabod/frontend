import { RoshCounter } from '@/components/Overlay/rosh/RoshCounter'
import { Settings } from '@/lib/defaultSettings'
import { isDev, type blockType } from '@/lib/devConsts'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

interface AnimateRoshProps {
  block: blockType
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
  roshan,
}: AnimateRoshProps) => {
  if (!roshan) return null

  const props = {
    color: roshan.minS ? 'red' : 'yellow',
    count: roshan.count,
    duration: roshan.minS || roshan.maxS,
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
      {roshan.minS ? <RoshCounter {...props} /> : null}
      {!roshan.minS && roshan.maxS ? <RoshCounter {...props} /> : null}
    </div>
  )
}
