'use client'
import Image from 'next/image'

export const Rankbadge = ({ image, leaderboard, rank }) => {
  return (
    <div className="flex flex-col items-center rounded-md bg-slate-500/50 p-1 shadow-md">
      <Image
        priority
        alt="rank badge"
        width={56}
        height={56}
        src={`/images/ranks/${image}`}
      />
      <span className="text-xs text-yellow-500">
        {leaderboard && '#'}
        {rank}
      </span>
    </div>
  )
}
