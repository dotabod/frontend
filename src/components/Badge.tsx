'use client'
import Image from 'next/image'

export const Badge = ({ transformRes, image, ...props }) => {
  return (
    <Image
      priority
      alt="rank badge"
      width={transformRes ? transformRes({ width: 69 }) : 56}
      height={transformRes ? transformRes({ height: 69 }) : 56}
      src={`/images/ranks/${image}`}
      {...props}
    />
  )
}
