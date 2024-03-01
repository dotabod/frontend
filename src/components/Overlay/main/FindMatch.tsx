import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'
import { MatchTimer } from './MatchTimer'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'

export const FindMatch = () => {
  const res = useTransformRes()
  const { data: isFindingMatchEnabled } = useUpdateSetting(
    Settings.queueBlockerFindMatch,
  )

  return (
    <>
      {isFindingMatchEnabled ? (
        <span
          id="find-match-main-menu-1"
          style={{
            fontSize: res({ w: 14 }),
            height: res({ h: 24 }),
            width: res({ w: 120 }),
            top: res({ h: 144 }),
            left: res({ w: 108 }),
          }}
          className="font-outline-2 absolute flex items-center rounded-sm bg-[#1b1c1f] font-[Radiance] font-semibold capitalize tracking-wide text-[#6A9561]"
        >
          Finding a Match
        </span>
      ) : (
        <span
          id="find-match-main-menu-1"
          style={{
            fontSize: res({ w: 14 }),
            height: res({ h: 24 }),
            width: res({ w: 120 }),
            top: res({ h: 144 }),
            left: res({ w: 108 }),
          }}
          className="font-outline-2 absolute flex items-center rounded-sm bg-[#1b1c1f] font-[Radiance] font-semibold capitalize tracking-wide text-[#6A9561]"
        >
          Main menu
        </span>
      )}

      {isFindingMatchEnabled ? (
        <span
          id="find-match-main-menu-2"
          style={{
            fontSize: res({ w: 14 }),
            height: res({ h: 24 }),
            width: res({ w: 131 }),
            top: res({ h: 224 }),
            left: res({ w: 411 }),
          }}
          className="font-outline-2 absolute flex items-center rounded-sm bg-black font-[Radiance] font-semibold uppercase tracking-wide text-[#77b26b]"
        >
          Finding a match
        </span>
      ) : (
        <span
          id="find-match-main-menu-2"
          style={{
            fontSize: res({ w: 14 }),
            height: res({ h: 24 }),
            width: res({ w: 131 }),
            top: res({ h: 224 }),
            left: res({ w: 411 }),
          }}
          className="font-outline-2 absolute flex items-center rounded-sm bg-black font-[Radiance] font-semibold uppercase tracking-wide text-[#77b26b]"
        >
          Main menu
        </span>
      )}

      <motion.div
        key="queue-blocker-class"
        {...motionProps}
        id="find-match-queue-blocker-main"
        style={{
          bottom: res({ h: 0 }), // correct is n
          right: res({ w: 0 }), // correct is 50
        }}
        className="absolute"
      >
        {isFindingMatchEnabled && <MatchTimer res={res} />}

        <img
          id="find-match-queue-blocker-bg"
          width={res({ w: 840 })}
          height={res({ h: 355 })}
          src={`/images/overlay/finding-match${
            !isFindingMatchEnabled ? '-old' : ''
          }.png`}
          alt="Finding Match"
          className="rounded-lg"
        />
      </motion.div>
    </>
  )
}
