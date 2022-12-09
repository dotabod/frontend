'use client'
import Image from 'next/image'

export const Badge = ({ transformRes, image, ...props }) => {
  return (
    <Image
      priority
      alt="rank badge"
      width={transformRes ? transformRes({ width: 56 }) : 56}
      height={transformRes ? transformRes({ height: 56 }) : 56}
      src={`/images/ranks/${image}`}
      {...props}
    />
  )
}
