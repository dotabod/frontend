import { clsx } from 'clsx'
import type { Dispatch, SetStateAction } from 'react'
import { AnimatedAegis } from '@/components/Overlay/aegis/AnimatedAegis'
import { InGameOutsideCenterV2, InGameV2 } from '@/components/Overlay/blocker/InGameV2'
import { type NotablePlayer, NotablePlayers } from '@/components/Overlay/NotablePlayers'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { AnimateRosh } from '@/components/Overlay/rosh/AnimateRosh'
import { SpectatorText } from '@/components/Overlay/SpectatorText'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { RestrictFeature } from '@/components/RestrictFeature'
import { Settings } from '@/lib/defaultSettings'
import type { blockType } from '@/lib/devConsts'
import type { AegisState, RoshanState } from '@/lib/hooks/rosh'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'
import type { RankImageDetails, wlType } from '@/lib/hooks/useSocket'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { MinimapBlocker } from './blocker/MinimapBlocker'

interface InGameOverlaysProps {
  wl: wlType
  block: blockType
  rankImageDetails: RankImageDetails
  paused: boolean
  roshan: RoshanState
  setRoshan: Dispatch<SetStateAction<RoshanState>>
  setAegis: Dispatch<SetStateAction<AegisState>>
  aegis: AegisState
  notablePlayers: NotablePlayer[]
}

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
}: InGameOverlaysProps) => {
  const res = useTransformRes()
  const { wlPosition } = useOverlayPositions()
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)

  if (!['spectator', 'playing', 'arcade'].includes(block.type ?? '')) {
    return null
  }

  return (
    <>
      <InGameOutsideCenterV2>
        <SpectatorText key='spectator-class' block={block} />
      </InGameOutsideCenterV2>

      <InGameOutsideCenterV2>
        <RestrictFeature feature='rosh'>
          <AnimateRosh
            key='animate-rosh-class'
            block={block}
            roshan={roshan}
            paused={paused}
            onComplete={() => {
              if (roshan?.minS) {
                setRoshan({ ...roshan, minS: 0 })
              } else {
                setRoshan({ ...roshan, maxS: 0, minS: 0 })
              }
            }}
          />
        </RestrictFeature>
      </InGameOutsideCenterV2>

      <InGameOutsideCenterV2>
        <RestrictFeature feature='aegis'>
          <AnimatedAegis
            key='animate-aegis-class'
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
        </RestrictFeature>
      </InGameOutsideCenterV2>

      <InGameV2>
        <RestrictFeature feature='notablePlayersOverlay'>
          <NotablePlayers players={notablePlayers} key='animate-np-class' block={block} />
        </RestrictFeature>
      </InGameV2>

      <InGameOutsideCenterV2>
        <RestrictFeature feature='minimap-blocker'>
          <MinimapBlocker block={block} key='minimap-blocker-class' />
        </RestrictFeature>
      </InGameOutsideCenterV2>

      <InGameOutsideCenterV2>
        <div
          className={clsx('absolute flex items-end justify-end', isRight && 'justify-start!')}
          id='ingame-wl-mmr-card'
          style={{ ...wlPosition, width: res({ w: 215 }) }}
        >
          <RestrictFeature feature='commandWL'>
            <AnimatedWL
              key='animate-wl-class'
              wl={wl}
              className={clsx('block', isRight && 'order-2')}
            />
          </RestrictFeature>

          <RestrictFeature feature='showRankImage'>
            <AnimatedRankBadge
              className={clsx('block', isRight && 'order-1')}
              key='animate-rank-badge-class'
              rankImageDetails={rankImageDetails}
            />
          </RestrictFeature>
        </div>
      </InGameOutsideCenterV2>
    </>
  )
}
