import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'
import { useTransformRes } from '@/lib/hooks/useTransformRes'

export const FindMatch = () => {
  const res = useTransformRes()

  return (
    <>
      <span
        style={{
          fontSize: res({ w: 14 }),
          height: res({ h: 24 }),
          width: res({ w: 120 }),
          top: res({ h: 143 }),
          left: res({ w: 108 }),
        }}
        className="font-outline-2 absolute flex items-center rounded-sm bg-[#1b1c1f] font-semibold capitalize tracking-wide text-[#6a9461]"
      >
        Main menu
      </span>

      <motion.div
        key="queue-blocker-class"
        {...motionProps}
        style={{
          bottom: res({ h: 0 }), // correct is n
          right: res({ w: 0 }), // correct is 50
        }}
        className="absolute"
      >
        <div
          style={{
            width: res({ w: 330 }),
            height: res({ h: 49 }),
            right: res({ w: 59 }),
            bottom: res({ h: 22 }),
          }}
          className="absolute flex items-center justify-center overflow-hidden"
        >
          <span
            style={{
              fontSize: res({ w: 26 }),
            }}
            className="font-outline-2 whitespace-nowrap font-bold uppercase tracking-[0.15em] text-white"
          >
            play dota
          </span>
        </div>

        <img
          width={res({ w: 850 })}
          height={res({ h: 355 })}
          src="/images/overlay/finding-match.png"
          alt="Finding Match"
        />
      </motion.div>
    </>
  )
}
