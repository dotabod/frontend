import Image from 'next/image'
import type { blockType } from '@/lib/devConsts'
import { useTransformRes } from '@/lib/hooks/useTransformRes'

export function HeroBlocker({
  teamName,
  type,
}: {
  teamName: 'radiant' | 'dire'
  type?: blockType['type']
}) {
  const res = useTransformRes()

  if (!type) return null

  return (
    <Image
      id={`hero-blocker-${type}`}
      priority
      unoptimized
      alt={`${type} blocker`}
      width={res({ w: 1920 })}
      height={res({ h: 1080 })}
      src={`/images/overlay/${type}/block-${teamName}-${type}.png`}
    />
  )
}
