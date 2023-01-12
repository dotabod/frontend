import Image from 'next/image'
import { zeroPad } from 'react-countdown'

export const AegisTimer = (
  transformRes: ({
    height,
    width,
  }: {
    height?: number
    width?: number
  }) => number
) => {
  return function render({ minutes, seconds, completed }) {
    if (completed) {
      return null
    }
    return (
      <div className="flex flex-col items-center">
        <Image
          className="animate-pulse"
          src="/images/rosh/aegis-icon-glow.png"
          width={transformRes({ width: 67 })}
          height={transformRes({ height: 1 })}
          alt="aegis icon"
        />
        <span
          className=" z-10 text-white/90"
          style={{
            marginLeft: transformRes({ width: 11 }),
            marginTop: transformRes({ height: -19 }),
            fontSize: transformRes({ height: 14 }),
          }}
        >
          {minutes}:{zeroPad(seconds)}
        </span>
      </div>
    )
  }
}
