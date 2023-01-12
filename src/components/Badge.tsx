import Image from 'next/image'

export const Badge = ({ transformRes, image, ...props }) => {
  return (
    <Image
      priority
      alt="rank badge"
      width={transformRes ? transformRes({ width: 72 }) : 56}
      height={transformRes ? transformRes({ height: 72 }) : 56}
      src={`/images/ranks/${image}`}
      {...props}
    />
  )
}
