import clsx from 'clsx'

import { Card } from '@/components/card'
import { Settings } from '@/lib/default-settings'
import type { wlType } from '@/lib/hooks/use-socket'
import { useTransformRes } from '@/lib/hooks/use-transform-res'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'

interface WLType {
  mainScreen?: boolean
  wl: wlType
  className?: string
}
const WinLossCard = ({ mainScreen = false, wl, className = '' }: WLType) => {
  const { data: isEnabled } = useUpdateSetting(Settings.commandWL)
  const res = useTransformRes()

  if (!isEnabled) {
    return null
  }
  const fontSize = res({ h: 18 })
  const windowFontSize = Math.max(res({ h: 12 }), 10)
  const windowLabel = (() => {
    if (wl.statsDays === null) {
      return 'This stream'
    }
    if (wl.statsDaysTotal) {
      return `${wl.statsDays} of ${wl.statsDaysTotal} challenge days elapsed`
    }
    return `Last ${wl.statsDays} ${wl.statsDays === 1 ? 'day' : 'days'}`
  })()
  const windowMarker = (() => {
    if (wl.statsDays === null) {
      return 'STREAM'
    }
    if (wl.statsDaysTotal) {
      return `${wl.statsDays} OF ${wl.statsDaysTotal} DAYS`
    }
    return `${wl.statsDays} ${wl.statsDays === 1 ? 'DAY' : 'DAYS'}`
  })()

  return (
    <Card
      className={clsx(
        !className && 'rounded-r-none',
        !className && mainScreen && 'bg-transparent p-0 leading-none text-[#e4d98d]',
        className,
      )}
      id='win-loss-card'
    >
      <div className='flex flex-col items-end'>
        <span
          aria-label={windowLabel}
          className={clsx(
            'font-sans font-semibold tracking-[0.04em] whitespace-nowrap text-white/75',
            mainScreen && 'text-[#e4d98d]/80',
          )}
          style={{ fontSize: windowFontSize, lineHeight: 1 }}
        >
          {windowMarker}
        </span>
        <div>
          {wl.records.map(({ win, lose, type }) => (
            <div
              style={{ fontSize }}
              key={type}
              className={clsx('w-full space-x-1', wl.records.length > 1 && 'font-mono')}
            >
              <span>{win || 0}</span>
              <span className='text-green-400'>W</span>
              <span>-</span>
              <span>{lose || 0}</span>
              <span className='text-red-400'>L</span>
              {wl.records.length > 1 ? <span className='text-sm'>{type}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default WinLossCard
