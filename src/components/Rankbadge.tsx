'use client'
import clsx from 'clsx'
import { Badge } from './Badge'
import { Card } from './Card'

export const Rankbadge = ({
  image,
  leaderboard = false,
  rank,
  transformRes,
  mainScreen = false,
  ...props
}) => {
  const className = clsx(
    !mainScreen &&
      (leaderboard || ['80.png', '92.png'].includes(image) ? '-mt-1' : '-mt-3'),
    'font-mono'
  )
  const style = {
    fontSize: transformRes ? transformRes({ height: 22 }) : 16,
  }

  const Numbers = () => (
    <span className={className} style={style}>
      {leaderboard && '#'}
      {rank}
    </span>
  )

  if (mainScreen) {
    return (
      <div {...props} className="flex items-center space-x-1 text-amber-200">
        <Badge
          transformRes={transformRes}
          width={50}
          height={50}
          image={image}
        />
        <Numbers />
      </div>
    )
  }
  return (
    <Card className="rounded-bl-none" {...props}>
      <Badge transformRes={transformRes} image={image} />
      <Numbers />
    </Card>
  )
}
