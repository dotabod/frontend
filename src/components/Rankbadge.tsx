'use client'
import { Badge } from './Badge'
import { Card } from './Card'

export const Rankbadge = ({ image, leaderboard, rank }) => {
  return (
    <Card>
      <Badge image={image} />
      <span>
        {leaderboard && '#'}
        {rank}
      </span>
    </Card>
  )
}
