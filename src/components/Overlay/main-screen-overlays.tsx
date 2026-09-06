import { FindMatch } from '@/components/Overlay/main/find-match'
import { AnimatedRankBadge } from '@/components/Overlay/rank/animated-rank-badge'
import { AnimatedWL } from '@/components/Overlay/wl/animated-wl'
import { Settings } from '@/lib/default-settings'
import type { blockType } from '@/lib/dev-consts'
import type { RankImageDetails, wlType } from '@/lib/hooks/use-socket'
import { useTransformRes } from '@/lib/hooks/use-transform-res'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'

import { RestrictFeature } from '../restrict-feature'

interface MainScreenOverlaysProps {
  block: blockType
  wl: wlType
  rankImageDetails: RankImageDetails
}

export const MainScreenOverlays = ({ block, wl, rankImageDetails }: MainScreenOverlaysProps) => {
  const res = useTransformRes()
  const { data: showQueueBlocker } = useUpdateSetting(Settings.queueBlocker)

  if (block.type !== null) {
    return null
  }

  return (
    <>
      {showQueueBlocker && (
        <RestrictFeature feature='queueBlocker'>
          <FindMatch />
        </RestrictFeature>
      )}
      <div
        style={{
          height: res({ h: 61 }),
          top: 0,
          width: '100%',
        }}
        id='main-screen-overlay'
        className='absolute'
      >
        <div
          id='main-screen-wl-mmr-card'
          className='absolute flex h-full items-center justify-center space-x-2'
          style={{
            right: res({ w: 416 }),
            width: res({ w: 299 }),
          }}
        >
          <RestrictFeature feature='commandWL'>
            <AnimatedWL
              mainScreen
              className='relative flex h-full items-center'
              key='animate-wl-class-main'
              wl={wl}
            />
          </RestrictFeature>

          <RestrictFeature feature='showRankImage'>
            <AnimatedRankBadge
              mainScreen
              key='animate-rank-badge-class-main'
              className='relative h-full leading-none'
              rankImageDetails={rankImageDetails}
            />
          </RestrictFeature>
        </div>
      </div>
    </>
  )
}
