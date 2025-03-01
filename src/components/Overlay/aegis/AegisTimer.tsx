import Image from 'next/image'
import { zeroPad } from 'react-countdown'

export const AegisTimer = ({ minutes, seconds, res }) => (
  <div className='flex flex-col items-center' id='aegis-timer'>
    <Image
      className='animate-pulse rounded-full'
      src='/images/rosh/aegis-icon-glow.png'
      width={res({ w: 40 })}
      height={res({ h: 38 })}
      alt='aegis icon'
    />
    <span
      className='font-outline-2 z-10 text-white/90'
      style={{
        marginTop: res({ h: -13 }),
        fontSize: res({ h: 14 }),
      }}
    >
      {minutes}:{zeroPad(seconds)}
    </span>
  </div>
)
