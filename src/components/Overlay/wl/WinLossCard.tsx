import clsx from 'clsx'
import { Card } from '@/components/Card'
import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

type WLType = {
  mainScreen?: boolean
  wl: { win: number; lose: number; type: string }[]
  className?: string
}
const WinLossCard = ({ mainScreen = false, wl, className = '' }: WLType) => {
  const { data: isEnabled } = useUpdateSetting(Settings.commandWL)
  const res = useTransformRes()

  if (!isEnabled) return null
  const fontSize = res({ h: 18 })

  return (
    <Card
      className={clsx(
        !className && 'rounded-r-none',
        !className && mainScreen && 'bg-transparent p-0 leading-none text-[#e4d98d]',
        className,
      )}
      id='win-loss-card'
    >
      {wl.map(({ win, lose, type }) => (
        <div
          style={{ fontSize }}
          key={type}
          className={clsx('w-full space-x-1', wl.length > 1 && 'font-mono')}
        >
          <span>{win || 0}</span>
          <span className='text-green-400'>W</span>
          <span>-</span>
          <span>{lose || 0}</span>
          <span className='text-red-400'>L</span>
          {wl.length > 1 ? <span className='text-sm'>{type}</span> : null}
        </div>
      ))}
    </Card>
  )
}

export default WinLossCard
