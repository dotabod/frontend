import Image from 'next/image'
import { zeroPad } from 'react-countdown'
import type { TransformRes } from '@/lib/hooks/useTransformRes'

interface AegisTimerProps {
  minutes: number
  seconds: number
  res: TransformRes
}

export const AegisTimer = ({ minutes, seconds, res }: AegisTimerProps) => (
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
        fontSize: res({ h: 14 }),
        marginTop: res({ h: -13 }),
      }}
    >
      {minutes}:{zeroPad(seconds)}
    </span>
  </div>
)
