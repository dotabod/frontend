import { RoshCounter } from '@/components/Overlay/rosh/RoshCounter'
import { Settings } from '@/lib/defaultSettings'
import { isDev } from '@/lib/hooks/rosh'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

interface AnimateRoshProps {
  block: any
  roshan: {
    minS: number
    minDate: string
    count: number
    maxDate: string
    maxS: number
  }
  paused: boolean
  onComplete: () => void
}

export const AnimateRosh = ({
  onComplete,
  paused,
  block,
  roshan: { count, maxDate, maxS, minDate, minS },
}: AnimateRoshProps) => {
  const props = {
    color: minDate ? 'red' : 'yellow',
    count,
    date: minDate || maxDate,
    duration: minS || maxS,
    onComplete,
    paused,
  }

  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const { data: isEnabled } = useUpdateSetting(Settings.rosh)

  if (!isEnabled || (block.type !== 'playing' && !isDev)) {
    return null
  }

  return (
    <div>
      {/*We have to create two counters, because the other one doesn't start unless the first one is unmounted */}
      {minDate && <RoshCounter {...props} />}
      {!minDate && maxDate && <RoshCounter {...props} />}
    </div>
  )
}
