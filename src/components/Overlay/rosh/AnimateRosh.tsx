import { RoshCounter } from '@/components/Overlay/rosh/RoshCounter'
import { Settings } from '@/lib/defaultSettings'
import { isDev } from '@/lib/hooks/rosh'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

interface AnimateRoshProps {
  block: any
  roshan: {
    minS: number
    count: number
    maxS: number
  }
  color: string
  duration: number
  paused: boolean
  onComplete: () => void
}

export const AnimateRosh = ({
  onComplete,
  paused,
  block,
  color,
  duration,
  roshan: { count, maxS, minS },
}: AnimateRoshProps) => {
  const props = {
    color,
    count,
    duration,
    onComplete,
    paused,
  }

  const { data: isEnabled } = useUpdateSetting(Settings.rosh)

  if (!isEnabled || (block.type !== 'playing' && !isDev)) {
    return null
  }

  return duration ? <RoshCounter {...props} /> : null
}
