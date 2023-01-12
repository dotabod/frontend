import { RoshCounter } from '@/components/Overlay/rosh/RoshCounter'
import Countdown from 'react-countdown'

interface AnimateRoshProps {
  style: { left: number; bottom: number; right: null }
  roshan: {
    minS: number
    minDate: string
    count: number
    maxDate: string
    maxS: number
  }
  paused: boolean
  onComplete: () => void
  transformRes: ({ height, width }: { height?: any; width?: any }) => number
  countdownRef: React.MutableRefObject<Countdown | undefined>
}

export const AnimateRosh = ({
  countdownRef,
  onComplete,
  paused,
  roshan: { count, maxDate, maxS, minDate, minS },
  style,
  transformRes,
}: AnimateRoshProps) => {
  const props = {
    color: minDate ? 'red' : 'yellow',
    count,
    countdownRef,
    date: minDate || maxDate,
    duration: minS || maxS,
    onComplete,
    paused,
    style,
    transformRes,
  }
  return (
    <div>
      {/*We have to create two counters, because the other one doesn't start unless the first one is unmounted */}
      {minDate && <RoshCounter {...props} />}
      {!minDate && maxDate && <RoshCounter {...props} />}
    </div>
  )
}
