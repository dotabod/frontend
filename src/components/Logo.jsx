import Image from 'next/image'

export function Logomark(props) {
  return (
    <Image
      alt="logo"
      width={148}
      height={128}
      src="/images/peepofat.webp"
      {...props}
    />
  )
}

export function Logo(props) {
  return (
    <div {...props}>
      <div className="flex h-full items-center justify-center space-x-2">
        <Logomark className="h-full w-auto" />
        <span className="fill-gray-900 font-medium">Dotabod</span>
      </div>
    </div>
  )
}
