import clsx from 'clsx'
import Image from 'next/image'
import { zeroPad } from 'react-countdown'

export const RoshTimer = ({ color, roshanCount, res, minutes, seconds }) => (
  <div className="flex flex-col items-center" id="rosh-timer">
    {roshanCount > 0 ? (
      <div
        className="absolute z-40 flex items-center justify-center rounded-full border border-slate-500 bg-black/60 font-[RadianceM] text-white/90 shadow"
        style={{
          height: res({ h: 20 }),
          width: res({ w: 20 }),
          top: res({ h: -2 }),
          left: res({ w: 0 }),
          fontSize: res({ h: 15 }),
          fontWeight: 500,
        }}
      >
        {roshanCount}
      </div>
    ) : null}
    <Image
      src="/images/rosh/roshan_timer_bg_psd1.png"
      height={res({ h: 95 })}
      width={res({ w: 95 })}
      style={{
        left: res({ w: 0 }),
        top: res({ h: 0 }),
        height: res({ h: 70 }),
        width: res({ w: 70 }),
        maxWidth: res({ w: 70 }),
      }}
      alt="main bg"
      className="absolute z-0"
    />
    <Image
      src="/images/rosh/icon_roshan_timerbackground_norosh_psd.png"
      height={res({ h: 40 })}
      width={res({ w: 40 })}
      style={{ top: res({ h: 8 }) }}
      alt="red glow"
      className={clsx('absolute z-10', color === 'yellow' && 'hue-rotate-60')}
    />
    <Image
      src="/images/rosh/roshan_timer_roshan_psd.png"
      height={res({ h: 28 })}
      width={res({ w: 28 })}
      alt="roshan icon"
      className="absolute z-20"
      style={{
        top: res({ h: 8 }),
        left: res({ h: 13 }),
      }}
    />
    <span
      className="absolute z-40 text-white/90"
      style={{
        bottom: res({ h: 8 }),
        fontSize: res({ h: 12 }),
      }}
    >
      {minutes}:{zeroPad(seconds)}
    </span>
  </div>
)
