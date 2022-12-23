'use client'
import { Badge } from './Badge'
import { Card } from './Card'

export const Rankbadge = ({
  image,
  leaderboard = false,
  rank,
  transformRes,
  ...props
}) => {
  return (
    <Card {...props}>
      <Badge transformRes={transformRes} image={image} />
      <span
        className={
          leaderboard || ['80.png', '92.png'].includes(image)
            ? '-mt-1'
            : '-mt-3'
        }
        style={{
          fontSize: transformRes ? transformRes({ height: 22 }) : 16,
        }}
      >
        {leaderboard && '#'}
        {rank}
      </span>
    </Card>
  )
}
