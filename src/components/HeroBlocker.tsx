'use client'
import Image from 'next/image'

export function HeroBlocker({ transformRes, teamName, type }) {
  if (!type) return null

  return (
    <Image
      priority
      alt={`${type} blocker`}
      width={transformRes({ width: 1920 })}
      height={transformRes({ height: 1080 })}
      src={`/images/block-${teamName}-${type}.png`}
    />
  )
}
