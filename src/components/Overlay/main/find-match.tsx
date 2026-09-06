import { motion } from 'framer-motion'

import { Settings } from '@/lib/default-settings'
import { getDotaFindingMatchLabel } from '@/lib/dota-finding-match-label'
import { useTransformRes } from '@/lib/hooks/use-transform-res'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import { motionProps } from '@/ui/utils'

import { MatchTimer } from './match-timer'

export const FindMatch = () => {
  const res = useTransformRes()
  const { data: isFindingMatchEnabled } = useUpdateSetting(Settings.queueBlockerFindMatch)
  const { original: settings } = useUpdateSetting()

  return (
    <>
      {isFindingMatchEnabled ? (
        <span
          id='find-match-main-menu-1'
          style={{
            fontSize: res({ w: 14 }),
            height: res({ h: 24 }),
            left: res({ w: 108 }),
            top: res({ h: 144 }),
            width: res({ w: 120 }),
          }}
          className='font-outline-2 absolute flex items-center rounded-xs bg-[#1b1c1f] font-[Radiance] font-semibold tracking-wide text-[#6A9561] capitalize'
        >
          Finding a Match
        </span>
      ) : (
        <span
          id='find-match-main-menu-1'
          style={{
            fontSize: res({ w: 14 }),
            height: res({ h: 24 }),
            left: res({ w: 108 }),
            top: res({ h: 144 }),
            width: res({ w: 120 }),
          }}
          className='font-outline-2 absolute flex items-center rounded-xs bg-[#1b1c1f] font-[Radiance] font-semibold tracking-wide text-[#6A9561] capitalize'
        >
          Main menu
        </span>
      )}

      {isFindingMatchEnabled ? (
        <span
          id='find-match-main-menu-2'
          style={{
            fontSize: res({ w: 14 }),
            height: res({ h: 24 }),
            left: res({ w: 411 }),
            top: res({ h: 224 }),
            width: res({ w: 131 }),
          }}
          className='font-outline-2 absolute flex items-center rounded-xs bg-black font-[Radiance] font-semibold tracking-wide text-[#77b26b] uppercase'
        >
          Finding a match
        </span>
      ) : (
        <span
          id='find-match-main-menu-2'
          style={{
            fontSize: res({ w: 14 }),
            height: res({ h: 24 }),
            left: res({ w: 411 }),
            top: res({ h: 224 }),
            width: res({ w: 131 }),
          }}
          className='font-outline-2 absolute flex items-center rounded-xs bg-black font-[Radiance] font-semibold tracking-wide text-[#77b26b] uppercase'
        >
          Main menu
        </span>
      )}

      <motion.div
        key='queue-blocker-class'
        {...motionProps}
        id='find-match-queue-blocker-main'
        style={{
          // Correct is n
          bottom: res({ h: 0 }),
          // Correct is 50
          right: res({ w: 0 }),
        }}
        className='absolute'
      >
        {isFindingMatchEnabled && <MatchTimer res={res} />}

        <img
          id='find-match-queue-blocker-bg'
          width={res({ w: 840 })}
          height={res({ h: 355 })}
          src={`/images/overlay/finding-match${isFindingMatchEnabled ? '' : '-old'}.png`}
          alt='Finding Match'
          className='rounded-lg'
        />

        {isFindingMatchEnabled && (
          <span
            data-testid='finding-match-label'
            style={{
              bottom: res({ h: 28 }),
              fontSize: res({ w: 28 }),
              letterSpacing: res({ w: 2.5 }),
              right: res({ w: 112 }),
              textShadow: `0 0 ${res({ w: 4 })}px rgba(222, 242, 255, 0.9), 0 0 ${res({
                w: 8,
              })}px rgba(222, 242, 255, 0.35), 0 ${res({
                h: 1,
              })}px ${res({ w: 2 })}px rgba(0, 0, 0, 0.95)`,
            }}
            className='absolute z-10 font-[Radiance] leading-none font-light whitespace-nowrap text-[#e8eef2] uppercase'
          >
            {getDotaFindingMatchLabel(settings.locale)}
          </span>
        )}
      </motion.div>
    </>
  )
}
