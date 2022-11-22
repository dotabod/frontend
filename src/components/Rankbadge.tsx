'use client'
import Image from 'next/image'

export const Card = ({ children }) => {
  return (
    <div className="flex flex-col items-center rounded bg-gray-500/50 p-1 text-xs text-white/60">
      {children}
    </div>
  )
}

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
