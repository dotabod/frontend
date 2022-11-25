'use client'
import Image from 'next/image'

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
