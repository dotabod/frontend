import { FindMatch } from '@/components/Overlay/main/FindMatch'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useWindowSize } from '@/lib/hooks/useWindowSize'

export const MainScreenOverlays = ({ block, wl, rankImageDetails }) => {
  const res = useTransformRes()
  const { width } = useWindowSize()
  const { data: showQueueBlocker } = useUpdateSetting(Settings.queueBlocker)

  if (![null].includes(block.type)) return null

  return (
    <>
      {showQueueBlocker && <FindMatch />}
      <div
        style={{
          height: res({ h: 61 }),
          width: width,
          top: 0,
        }}
        id="main-screen-overlay"
        className="absolute"
      >
        <div
          id="main-screen-wl-mmr-card"
          className="absolute flex h-full items-center justify-center space-x-2 "
          style={{
            width: res({ w: 299 }),
            right: res({ w: 416 }),
          }}
        >
          <AnimatedWL
            mainScreen
            className="relative flex h-full items-center"
            key="animate-wl-class-main"
            wl={wl}
          />

          <AnimatedRankBadge
            mainScreen
            key="animate-rank-badge-class-main"
            className="relative h-full leading-none"
            rankImageDetails={rankImageDetails}
          />
        </div>
      </div>
    </>
  )
}
