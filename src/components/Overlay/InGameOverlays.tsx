import { NotablePlayers } from '@/components/Overlay/NotablePlayers'
import { SpectatorText } from '@/components/Overlay/SpectatorText'
import { AnimatedAegis } from '@/components/Overlay/aegis/AnimatedAegis'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { AnimateRosh } from '@/components/Overlay/rosh/AnimateRosh'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { Settings } from '@/lib/defaultSettings'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { clsx } from 'clsx'
import { MinimapBlocker } from './blocker/MinimapBlocker'

export const InGameOverlays = ({
  wl,
  block,
  rankImageDetails,
  paused,
  roshan,
  setRoshan,
  setAegis,
  aegis,
  notablePlayers,
}) => {
  const res = useTransformRes()
  const { wlPosition } = useOverlayPositions()
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)

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
          if (roshan?.minS) {
            setRoshan({ ...roshan, minS: 0 })
          } else {
            setRoshan({ ...roshan, minS: 0, maxS: 0 })
          }
        }}
      />

      <AnimatedAegis
        key="animate-aegis-class"
        block={block}
        paused={paused}
        aegis={aegis}
        onComplete={() => {
          setAegis({
            expireS: 0,
            playerId: null,
          })
        }}
      />

      <NotablePlayers
        players={notablePlayers}
        key="animate-np-class"
        block={block}
      />

      <MinimapBlocker block={block} key="minimap-blocker-class" />

      <div
        className={clsx(
          'absolute flex items-end justify-end',
          isRight && '!justify-start'
        )}
        id="ingame-wl-mmr-card"
        style={{ ...wlPosition, width: res({ w: 215 }) }}
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
