'use client'
import Image from 'next/image'

export const Rankbadge = ({ image, leaderboard, rank }) => {
  return (
    <div className="flex flex-col items-center rounded border-t border-gray-400/50 bg-gray-500/50 p-1">
      <Image
        priority
        alt="rank badge"
        width={56}
        height={56}
        src={`/images/ranks/${image}`}
      />
      <span className="text-xs text-white/60">
        {leaderboard && '#'}
        {rank}
      </span>
    </div>
  )
}
