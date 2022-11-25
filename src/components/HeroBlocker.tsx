'use client'
import Image from 'next/image'

export function HeroBlocker({ teamName, type }) {
  if (!type) return null

  return (
    <Image
      priority
      alt={`${type} blocker`}
      width={1920}
      height={1080}
      src={`/images/block-${teamName}-${type}.png`}
    />
  )
}
