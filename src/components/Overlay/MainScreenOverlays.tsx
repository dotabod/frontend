import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useWindowSize } from '@/lib/hooks/useWindowSize'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'

export const MainScreenOverlays = ({ block, wl, rankImageDetails }) => {
  const res = useTransformRes()
  const { width } = useWindowSize()

  if (![null].includes(block.type)) return null

  return (
    <div
      style={{
        height: res({ h: 61 }),
        width: width,
        top: 0,
      }}
      className="absolute"
    >
      <div
        className="flex h-full items-center justify-end space-x-2"
        style={{
          marginRight: res({ w: 428 }),
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
          className="relative h-full"
          rankImageDetails={rankImageDetails}
        />
      </div>
    </div>
  )
}
