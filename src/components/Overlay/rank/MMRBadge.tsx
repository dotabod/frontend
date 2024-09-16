import { useTransformRes } from '@/lib/hooks/useTransformRes'
import clsx from 'clsx'
import { Badge } from '../../Badge'
import { Card } from '../../Card'

const Numbers = ({ hasImage, leaderboard, rank, className = '', ...props }) => {
  const res = useTransformRes()

  const fontSize = res({ h: 18 })
  return (
    <div
      id="rank-numbers"
      style={{ fontSize }}
      className={clsx(className, 'flex flex-col items-center')}
      {...props}
    >
      <span key="leaderboard">{leaderboard && `#${leaderboard}`}</span>
      <span
        key="rank"
        className={clsx(
          leaderboard && 'text-base',
          !rank && !leaderboard && 'hidden'
        )}
      >
        {rank && rank}
        {rank && (leaderboard || !hasImage || rank) && ' MMR'}
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
          key="main-badge"
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
    <Card
      {...props}
      className={clsx(className, 'rounded-bl-none')}
      id="rank-card"
    >
      <Badge
        key="card-badge"
        width={res({ w: 82 })}
        height={res({ h: 75 })}
        image={image}
        id="rank-badge"
      />
      <Numbers
        hasImage={!!image}
        rank={rank}
        leaderboard={leaderboard}
        className={clsx(
          !image && 'mt-0',
          (leaderboard || ['80.png', '91.png', '92.png'].includes(image)) &&
            '-mt-1',
          image && rank && !leaderboard && '-mt-3'
        )}
      />
    </Card>
  )
}
