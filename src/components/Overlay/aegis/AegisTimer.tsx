import Image from 'next/image'
import { zeroPad } from 'react-countdown'

export const AegisTimer = ({ minutes, seconds, res }) => (
  <div className="flex flex-col items-center">
    <Image
      className="animate-pulse"
      src="/images/rosh/aegis-icon-glow.png"
      width={res({ w: 67 })}
      height={res({ h: 1 })}
      alt="aegis icon"
    />
    <span
      className=" z-10 text-white/90"
      style={{
        marginLeft: res({ w: 11 }),
        marginTop: res({ h: -19 }),
        fontSize: res({ h: 14 }),
      }}
    >
      {minutes}:{zeroPad(seconds)}
    </span>
  </div>
)
