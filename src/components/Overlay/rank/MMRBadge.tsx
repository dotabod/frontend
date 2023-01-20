import { Badge } from '../../Badge'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import clsx from 'clsx'
import { Card } from '../../Card'

export const Numbers = ({ leaderboard, rank, className, ...props }) => {
  const res = useTransformRes()

  const fontSize = res?.({ h: 22 }) ?? 16
  return (
    <span style={{ fontSize }} className={clsx(className)} {...props}>
      {leaderboard && '#'}
      {rank ? rank : ''}
    </span>
  )
}

export const MMRBadge = ({
  image,
  leaderboard = false,
  rank,
  mainScreen = false,
  className = '',
  ...props
}) => {
  const res = useTransformRes()
  const { data: isEnabled } = useUpdateSetting(Settings['mmr-tracker'])

  if (!isEnabled) return null

  if (mainScreen) {
    return (
      <div
        {...props}
        className={clsx(
          'flex h-full items-center space-x-1 text-[#e4d98d]',
          className
        )}
      >
        <Badge
          width={res?.({ w: 75 }) ?? 75}
          height={res?.({ h: 75 }) ?? 75}
          image={image}
          style={{
            marginTop: res?.({ h: 20 }) ?? 0,
          }}
        />
        <Numbers className="font-mono" rank={rank} leaderboard={leaderboard} />
      </div>
    )
  }
  return (
    <Card {...props} className={clsx(className, 'rounded-bl-none')}>
      <Badge
        width={res?.({ w: 82 }) ?? 82}
        height={res?.({ h: 75 }) ?? 75}
        image={image}
      />
      <Numbers
        rank={rank}
        leaderboard={leaderboard}
        className={
          leaderboard || ['80.png', '92.png'].includes(image)
            ? '-mt-1'
            : '-mt-3'
        }
      />
    </Card>
  )
}
