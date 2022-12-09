'use client'
import { Badge } from './Badge'
import { Card } from './Card'

export const Rankbadge = ({
  image,
  leaderboard,
  rank,
  transformRes,
  ...props
}) => {
  return (
    <Card {...props}>
      <Badge transformRes={transformRes} image={image} />
      <span
        style={{
          fontSize: transformRes ? transformRes({ height: 16 }) : 16,
        }}
      >
        {leaderboard && '#'}
        {rank}
      </span>
    </Card>
  )
}
