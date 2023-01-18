import Image from 'next/image'

export const Badge = ({ res, image, ...props }) => {
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
