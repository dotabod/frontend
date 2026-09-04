import { Skeleton } from 'antd'
import { useWinLoss } from '@/lib/hooks/useWinLoss'

function getWindowLabel(statsDays: number | null): string {
  if (statsDays === null) return 'This stream'
  return `Last ${statsDays} ${statsDays === 1 ? 'day' : 'days'}`
}

export function ProfileWinLossCounter({ twitchId }: { twitchId?: string | null }) {
  const { connected, error, loading, wl } = useWinLoss({ twitchId })

  if (!twitchId || error) return null
  if (loading || !wl) {
    return <Skeleton.Input active size='small' style={{ height: 20, width: 150 }} />
  }

  return (
    <span
      aria-label='Win/loss record'
      aria-live='polite'
      className='inline-flex flex-wrap items-center gap-2 tabular-nums'
    >
      <span className='text-xs font-medium text-gray-500'>WL</span>
      {wl.records.map(({ lose, type, win }) => (
        <span key={type} className='whitespace-nowrap text-gray-200'>
          <span className='text-emerald-300'>{win || 0} W</span>{' '}
          <span className='text-gray-600'>-</span>{' '}
          <span className='text-red-300'>{lose || 0} L</span>
          {wl.records.length > 1 && <span className='ml-1 text-xs text-gray-500'>{type}</span>}
        </span>
      ))}
      <span className='rounded-md border border-gray-700 bg-gray-900/60 px-2 py-0.5 text-xs text-gray-400'>
        {getWindowLabel(wl.statsDays)}
      </span>
      <span
        className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-gray-600'}`}
        title={connected ? 'Updates as matches finish' : 'Reconnecting live stats'}
        aria-hidden
      />
      <span className='sr-only'>
        {connected ? 'Updates as matches finish' : 'Reconnecting live stats'}
      </span>
    </span>
  )
}
