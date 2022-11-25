'use client'
import Image from 'next/image'
import { Card } from './Card'

export const Badge = ({ image, ...props }) => {
  return (
    <Image
      priority
      alt="rank badge"
      width={56}
      height={56}
      src={`/images/ranks/${image}`}
      {...props}
    />
  )
}

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
