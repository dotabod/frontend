import clsx from 'clsx'
import Image from 'next/image'
import { zeroPad } from 'react-countdown'
import { ordinal } from '@/pages/overlay/[userId]'

export const RoshTimer = ({ color, count, transformRes }) => {
  return function render({ minutes, seconds, completed }) {
    if (completed) {
      return null
    }

    return (
      <div className="flex flex-col items-center">
        {count > 0 && (
          <span
            className="absolute z-40 text-white/90"
            style={{
              top: transformRes({ height: -5 }),
              left: transformRes({ width: 0 }),
              fontSize: transformRes({ height: 16 }),
              fontWeight: 500,
            }}
          >
            {ordinal(count)}
          </span>
        )}
        <Image
          src="/images/rosh/roshan_timer_bg_psd1.png"
          height={transformRes({ height: 95 })}
          width={transformRes({ width: 95 })}
          style={{
            left: transformRes({ width: 0 }),
            top: transformRes({ height: 0 }),
            height: transformRes({ height: 70 }),
            width: transformRes({ width: 70 }),
            maxWidth: transformRes({ width: 70 }),
          }}
          alt="main bg"
          className="absolute z-0"
        />
        <Image
          src="/images/rosh/icon_roshan_timerbackground_norosh_psd.png"
          height={transformRes({ height: 40 })}
          width={transformRes({ width: 40 })}
          style={{ top: transformRes({ height: 8 }) }}
          alt="red glow"
          className={clsx(
            'absolute z-10',
            color === 'yellow' && 'hue-rotate-60'
          )}
        />
        <Image
          src="/images/rosh/roshan_timer_roshan_psd.png"
          height={transformRes({ height: 28 })}
          width={transformRes({ width: 28 })}
          alt="roshan icon"
          className="absolute z-20"
          style={{
            top: transformRes({ height: 8 }),
            left: transformRes({ height: 13 }),
          }}
        />
        <span
          className="absolute z-40 text-white/90"
          style={{
            bottom: transformRes({ height: 8 }),
            fontSize: transformRes({ height: 12 }),
          }}
        >
          {minutes}:{zeroPad(seconds)}
        </span>
      </div>
    )
  }
}
