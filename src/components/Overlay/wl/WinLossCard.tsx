import clsx from 'clsx'
import { Card } from '@/components/Card'
import { Settings } from '@/lib/defaultSettings'
import type { wlType } from '@/lib/hooks/useSocket'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

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
  const windowFontSize = Math.max(res({ h: 10 }), 8)
  const windowLabel =
    wl.statsDays === null
      ? 'This stream'
      : `Last ${wl.statsDays} ${wl.statsDays === 1 ? 'day' : 'days'}`
  const windowMarker = wl.statsDays === null ? 'STREAM' : `${wl.statsDays}D`

  return (
    <Card
      className={clsx(
        !className && 'rounded-r-none',
        !className && mainScreen && 'bg-transparent p-0 leading-none text-[#e4d98d]',
        className,
      )}
      id='win-loss-card'
    >
      <div className='flex items-start gap-1.5'>
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
        <span
          aria-label={windowLabel}
          className={clsx(
            'mt-0.5 whitespace-nowrap font-sans font-medium tracking-[0.08em] text-white/45',
            mainScreen && 'text-[#e4d98d]/55',
          )}
          style={{ fontSize: windowFontSize, lineHeight: 1 }}
        >
          {windowMarker}
        </span>
      </div>
    </Card>
  )
}

export default WinLossCard
