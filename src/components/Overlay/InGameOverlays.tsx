import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { SpectatorText } from '@/components/Overlay/SpectatorText'
import { AnimateRosh } from '@/components/Overlay/rosh/AnimateRosh'
import { AnimatedAegis } from '@/components/Overlay/aegis/AnimatedAegis'
import { MinimapBlocker } from '@/components/Overlay/blocker/MinimapBlocker'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'
import { clsx } from '@mantine/styles'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'

export const InGameOverlays = ({
  wl,
  block,
  rankImageDetails,
  paused,
  roshan,
  setRoshan,
  setAegis,
  aegis,
}) => {
  const res = useTransformRes()
  const { wlPosition } = useOverlayPositions()
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)

  if (!['spectator', 'playing', 'arcade'].includes(block.type)) return null

  return (
    <>
      <SpectatorText key="spectator-class" block={block} />

      <AnimateRosh
        key="animate-rosh-class-red"
        block={block}
        roshan={roshan}
        paused={paused}
        color={roshan?.minS ? 'red' : null}
        duration={roshan?.minS ? roshan?.minS : null}
        onComplete={() => {
          setRoshan((prev) => ({ ...prev, minS: 0 }))
        }}
      />
      <AnimateRosh
        key="animate-rosh-class-yellow"
        block={block}
        roshan={roshan}
        paused={paused}
        color={!roshan?.minS ? 'yellow' : null}
        duration={!roshan?.minS ? roshan?.maxS : null}
        onComplete={() => {
          setRoshan((prev) => ({ ...prev, minS: 0, maxS: 0 }))
        }}
      />

      <AnimatedAegis
        key="animate-aegis-class"
        block={block}
        paused={paused}
        aegis={aegis}
        top={res({ h: 65 })}
        onComplete={() => {
          setAegis({
            expireS: 0,
            playerId: null,
          })
        }}
      />

      <MinimapBlocker block={block} key="minimap-blocker-class" />

      <div
        className={clsx(
          'absolute flex items-end justify-end',
          isRight && '!justify-start'
        )}
        style={{ ...wlPosition, width: res({ w: 245 }) }}
      >
        <AnimatedWL
          key="animate-wl-class"
          wl={wl}
          className={clsx('block', isRight && 'order-2')}
        />

        <AnimatedRankBadge
          className={clsx('block', isRight && 'order-1')}
          key="animate-rank-badge-class"
          rankImageDetails={rankImageDetails}
        />
      </div>
    </>
  )
}
