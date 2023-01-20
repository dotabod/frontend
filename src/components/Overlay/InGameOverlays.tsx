import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { SpectatorText } from '@/components/Overlay/SpectatorText'
import { AnimateRosh } from '@/components/Overlay/rosh/AnimateRosh'
import { AnimatedAegis } from '@/components/Overlay/aegis/AnimatedAegis'
import { MinimapBlocker } from '@/components/Overlay/blocker/MinimapBlocker'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { PollOverlay } from '@/components/Overlay/PollOverlay'

export const InGameOverlays = ({
  wl,
  block,
  rankImageDetails,
  paused,
  roshan,
  setRoshan,
  setAegis,
  pollData,
  betData,
  aegis,
}) => {
  const res = useTransformRes()

  if (!['spectator', 'playing', 'arcade'].includes(block.type)) return null

  return (
    <>
      <div
        key="poll-primary"
        className="absolute"
        style={{
          right: res({ w: 1920 / 2 - 200 }),
          top: res({ h: 70 }),
          width: res({ w: 400 }),
        }}
      >
        {pollData && (
          <PollOverlay
            key="poll-overlay"
            endDate={pollData.endDate}
            title={pollData.title}
            choices={pollData.choices}
          />
        )}
        {betData && (
          <PollOverlay
            key="bet-overlay"
            endDate={betData.endDate}
            title={betData.title}
            choices={betData.outcomes}
          />
        )}
      </div>

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

      <AnimatedWL
        key="animate-wl-class"
        wl={wl}
        isLeaderboard={!!rankImageDetails?.leaderboard}
      />

      <AnimatedRankBadge
        key="animate-rank-badge-class"
        rankImageDetails={rankImageDetails}
      />
    </>
  )
}
