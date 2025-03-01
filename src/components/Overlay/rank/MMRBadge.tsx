import NumberTicker from '@/components/magicui/number-ticker'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import clsx from 'clsx'
import { Badge } from '../../Badge'
import { Card } from '../../Card'

interface NumbersProps {
  hasImage: boolean
  leaderboardPosition?: number | null
  playerRank?: number | null
  className?: string
}

const Numbers: React.FC<NumbersProps> = ({
  hasImage,
  leaderboardPosition,
  playerRank,
  className = '',
}) => {
  const transformRes = useTransformRes()
  const fontSize = transformRes({ h: 18 })

  // Helper function to render leaderboard position
  const renderLeaderboard = () => {
    if (!leaderboardPosition) return null
    return <span>{`#${leaderboardPosition}`}</span>
  }

  // Helper function to render rank
  const renderRank = () => {
    if (!playerRank && !leaderboardPosition) return null

    if (playerRank && (leaderboardPosition || !hasImage || playerRank)) {
      return (
        <span className={clsx(leaderboardPosition ? 'text-base' : '', !playerRank && 'hidden')}>
          <NumberTicker value={playerRank} />
          {' MMR'}
        </span>
      )
    }

    return null
  }

  return (
    <div
      id='rank-numbers'
      style={{ fontSize }}
      className={clsx(className, 'flex flex-col items-center')}
    >
      {renderLeaderboard()}
      {renderRank()}
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
  style,
  ...props
}: {
  image?: string | null
  leaderboard?: number | null
  rank?: number | null
  mainScreen?: boolean
  className?: string
  notLoaded?: boolean
  style?: React.CSSProperties
}) => {
  const res = useTransformRes()
  if (!image && !leaderboard && !rank) return null

  if (mainScreen) {
    return (
      <div
        {...props}
        style={style}
        className={clsx('flex h-full items-center space-x-1 text-[#e4d98d]', className)}
      >
        <Badge
          key='main-badge'
          width={res({ w: 75 })}
          height={res({ h: 75 })}
          image={image}
          style={{
            marginTop: res({ h: 20 }),
          }}
        />
        <Numbers hasImage={!!image} playerRank={rank} leaderboardPosition={leaderboard} />
      </div>
    )
  }

  return (
    <Card {...props} style={style} className={clsx(className, 'rounded-bl-none')} id='rank-card'>
      <Badge
        key='card-badge'
        width={res({ w: 82 })}
        height={res({ h: 75 })}
        image={image}
        id='rank-badge'
      />
      <Numbers
        hasImage={!!image}
        playerRank={rank}
        leaderboardPosition={leaderboard}
        className={clsx(
          !image && 'mt-0',
          (leaderboard || ['80.png', '91.png', '92.png'].includes(image ?? '')) && '-mt-1',
          image && rank && !leaderboard && '-mt-3',
        )}
      />
    </Card>
  )
}
