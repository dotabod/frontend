import { Card } from '@/components/Card'
import clsx from 'clsx'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'

type WLType = {
  mainScreen?: boolean
  wl: { win: number; lose: number; type: string }[]
}
const WinLossCard = ({ mainScreen = false, wl, ...props }: WLType) => {
  const { data: isEnabled } = useUpdateSetting(Settings.commandWL)

  if (!isEnabled) return null

  return (
    <Card
      className={clsx(
        'rounded-r-none',
        mainScreen && 'bg-transparent p-0 leading-none text-[#e4d98d]'
      )}
      {...props}
    >
      {wl.map(({ win, lose, type }) => (
        <div key={type} className="w-full space-x-1 font-mono">
          <span className="space-x-1">
            <span>{win || 0}</span>
            <span className="text-green-300">W</span>
            <span>-</span>
            <span>{lose || 0}</span>
            <span className="text-red-300">L</span>
          </span>
          {wl.length > 1 && <span className="text-sm">{type}</span>}
        </div>
      ))}
    </Card>
  )
}

export default WinLossCard
