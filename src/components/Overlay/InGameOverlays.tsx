import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { SpectatorText } from '@/components/Overlay/SpectatorText'
import { AnimateRosh } from '@/components/Overlay/rosh/AnimateRosh'
import { AnimatedAegis } from '@/components/Overlay/aegis/AnimatedAegis'
import { MinimapBlocker } from '@/components/Overlay/blocker/MinimapBlocker'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'

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

  if (!['spectator', 'playing', 'arcade'].includes(block.type)) return null

  return (
    <>
      <SpectatorText key="spectator-class" block={block} />

      <AnimateRosh
        key="animate-rosh-class"
        block={block}
        roshan={roshan}
        paused={paused}
        onComplete={() => {
          if (roshan?.minDate) {
            setRoshan({ ...roshan, minDate: '', minS: 0 })
          } else {
            setRoshan({
              ...roshan,
              maxDate: '',
              maxS: 0,
            })
          }
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
            expireTime: '',
            expireDate: '',
            playerId: null,
          })
        }}
      />

      <MinimapBlocker block={block} key="minimap-blocker-class" />

      <div
        className="absolute flex items-end justify-center"
        style={{ ...wlPosition, width: res({ w: 225 }) }}
      >
        <AnimatedWL key="animate-wl-class" wl={wl} className="block" />

        <AnimatedRankBadge
          className="block"
          key="animate-rank-badge-class"
          rankImageDetails={rankImageDetails}
        />
      </div>
    </>
  )
}
