'use client'
import Image from 'next/image'
import { Card } from './Card'

export const Rankbadge = ({ image, leaderboard, rank }) => {
  return (
    <Card>
      <Image
        priority
        alt="rank badge"
        width={56}
        height={56}
        src={`/images/ranks/${image}`}
      />
      <span>
        {leaderboard && '#'}
        {rank}
      </span>
    </Card>
  )
}
