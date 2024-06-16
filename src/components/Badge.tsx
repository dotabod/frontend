import { useTransformRes } from '@/lib/hooks/useTransformRes'
import Image from 'next/image'

export const Badge = ({ image, ...props }) => {
  const res = useTransformRes()

  if (!image) return null

  return (
    <Image
      priority
      alt="rank badge"
      width={res ? res({ w: 72 }) : 56}
      height={res ? res({ h: 72 }) : 56}
      src={`/images/ranks/${image}`}
      {...props}
    />
  )
}
