// @ts-nocheck
import Image from 'next/image'
import { useTransformRes } from '@/lib/hooks/useTransformRes'

interface BadgeProps {
  image: string
}

export const Badge = ({
  image,
  alt = 'rank badge',
  ...props
}: BadgeProps & Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'>) => {
  const res = useTransformRes()

  if (!image) return null

  return (
    <Image
      priority
      alt={alt}
      width={res ? res({ w: 72 }) : 56}
      height={res ? res({ h: 72 }) : 56}
      src={`/images/ranks/${image}`}
      {...props}
    />
  )
}
