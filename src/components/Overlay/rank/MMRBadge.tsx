import { Badge } from '../../Badge'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import clsx from 'clsx'
import { Card } from '../../Card'

export const Numbers = ({
  hasImage,
  leaderboard,
  rank,
  className = '',
  ...props
}) => {
  const res = useTransformRes()

  const fontSize = res({ h: 18 })
  return (
    <div
      style={{ fontSize }}
      className={clsx(className, 'flex flex-col items-center')}
      {...props}
    >
      <span>{leaderboard && `#${leaderboard}`}</span>
      <span
        className={clsx(
          leaderboard && 'text-base',
          !rank && !leaderboard && 'hidden'
        )}
      >
        {rank && rank}
        {((leaderboard && rank) || !hasImage) && ' MMR'}
      </span>
    </div>
  )
}

export const MMRBadge = ({
  image,
  leaderboard = null,
  rank,
  mainScreen = false,
  className = '',
  notLoaded = undefined,
  ...props
}) => {
  const res = useTransformRes()
  if (!image && !leaderboard && !rank) return null

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
          width={res({ w: 75 })}
          height={res({ h: 75 })}
          image={image}
          style={{
            marginTop: res({ h: 20 }),
          }}
        />
        <Numbers hasImage={!!image} rank={rank} leaderboard={leaderboard} />
      </div>
    )
  }

  return (
    <Card {...props} className={clsx(className, 'rounded-bl-none')}>
      <Badge width={res({ w: 82 })} height={res({ h: 75 })} image={image} />
      <Numbers
        hasImage={!!image}
        rank={rank}
        leaderboard={leaderboard}
        className={clsx(
          !image && 'mt-0',
          (leaderboard || ['80.png', '91.png', '92.png'].includes(image)) &&
            '-mt-1',
          image && rank && '-mt-3'
        )}
      />
    </Card>
  )
}
