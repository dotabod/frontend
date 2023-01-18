import { AnimatePresence } from 'framer-motion'
import Head from 'next/head'
import Image from 'next/image'
import { useState } from 'react'
import { SpectatorText } from '@/components/Overlay/SpectatorText'
import { MinimapBlocker } from '@/components/Overlay/blocker/MinimapBlocker'
import { AnimateRosh } from '@/components/Overlay/rosh/AnimateRosh'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { AnimatedHeroBlocker } from '@/components/Overlay/blocker/AnimatedHeroBlocker'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { AnimatedAegis } from '@/components/Overlay/aegis/AnimatedAegis'
import { isDev, useAegis, useRoshan } from '@/lib/hooks/rosh'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useSocket } from '@/lib/hooks/useSocket'
import { useOBS } from '@/lib/hooks/useOBS'
import { useWindowSize } from '@/lib/hooks/useWindowSize'

export default function OverlayPage() {
  const { height, width } = useWindowSize()
  const res = useTransformRes()

  const [connected, setConnected] = useState(false)
  const [block, setBlock] = useState({ matchId: null, team: null, type: null })
  const [paused, setPaused] = useState(false)
  const { roshan, setRoshan } = useRoshan()
  const { aegis, setAegis } = useAegis()
  const [wl, setWL] = useState([
    {
      win: isDev ? 2 : 0,
      lose: isDev ? 1 : 0,
      type: 'U',
    },
  ])

  const [rankImageDetails, setRankImageDetails] = useState({
    image: isDev ? '41.png' : '0.png',
    rank: isDev ? 5380 : 0,
    leaderboard: false,
  })

  useSocket({
    setAegis,
    setBlock,
    setConnected,
    setPaused,
    setRankImageDetails,
    setRoshan,
    setWL,
  })

  useOBS({ block, connected })

  return (
    <>
      <Head>
        <title>Dotabod | Stream overlays</title>
      </Head>
      <style global jsx>{`
        html,
        body {
          overflow: hidden;
        }
      `}</style>
      <AnimatePresence>
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
        <AnimatedHeroBlocker block={block} key="hero-blocker-class" />

        {['spectator', 'playing', 'arcade'].includes(block.type) && (
          <>
            <AnimatedWL key="animate-wl-class" wl={wl} />

            <AnimatedRankBadge
              key="animate-rank-badge-class"
              rankImageDetails={rankImageDetails}
            />
          </>
        )}

        {[null].includes(block.type) && (
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
                marginRight: res({ w: 470 }),
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
        )}

        {isDev && (
          <Image
            key="dev-image"
            width={width}
            height={height}
            alt={`main game`}
            src={`/images/dev/main-menu.png`}
          />
        )}
      </AnimatePresence>
    </>
  )
}
