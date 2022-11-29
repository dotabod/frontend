'use client'
import { Badge } from './Badge'
import { Card } from './Card'

export const Rankbadge = ({ image, leaderboard, rank, ...props }) => {
  return (
    <Card {...props}>
      <Badge image={image} />
      <span>
        {leaderboard && '#'}
        {rank}
      </span>
    </Card>
  )
}
