'use client'
import Image from 'next/image'

export const Badge = ({ transformRes, image, ...props }) => {
  return (
    <Image
      priority
      alt="rank badge"
      width={transformRes({ width: 56 })}
      height={transformRes({ height: 56 })}
      src={`/images/ranks/${image}`}
      {...props}
    />
  )
}
