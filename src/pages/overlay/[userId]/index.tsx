import { AnimatePresence } from 'framer-motion'
import Head from 'next/head'
import Image from 'next/image'
import { useState } from 'react'
import { PickScreenOverlays } from '@/components/Overlay/blocker/PickScreenOverlays'
import { isDev, useAegis, useRoshan } from '@/lib/hooks/rosh'
import { useSocket } from '@/lib/hooks/useSocket'
import { useOBS } from '@/lib/hooks/useOBS'
import { useWindowSize } from '@/lib/hooks/useWindowSize'
import { InGameOverlays } from '@/components/Overlay/InGameOverlays'
import { MainScreenOverlays } from '@/components/Overlay/MainScreenOverlays'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { PollOverlay } from '@/components/Overlay/PollOverlay'

const devBlockTypes = {
  matchId: 123456789,
  team: 'radiant',
  type: 'playing',
}

export default function OverlayPage() {
  const { height, width } = useWindowSize()
  const [connected, setConnected] = useState(false)

  const [block, setBlock] = useState(
    isDev
      ? devBlockTypes
      : {
          matchId: null,
          team: null,
          type: null,
        }
  )
  const [pollData, setPollData] = useState<{
    title: string
    endDate: string
    choices: { title: string; totalVotes?: number }[]
  } | null>(null)
  const [betData, setBetData] = useState<{
    title: string
    endDate: string
    outcomes: { title: string; totalVotes: number; channelPoints: number }[]
  } | null>(null)
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
    setPollData,
    setBetData,
    setWL,
  })

  useOBS({ block, connected })

  const res = useTransformRes()
  const windowSize = useWindowSize()

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
              block={block}
              endDate={pollData.endDate}
              title={pollData.title}
              choices={pollData.choices}
            />
          )}
          {betData && (
            <PollOverlay
              key="bet-overlay"
              block={block}
              endDate={betData.endDate}
              title={betData.title}
              choices={betData.outcomes}
            />
          )}
        </div>

        <MainScreenOverlays
          key="main-screen-overlays"
          block={block}
          wl={wl}
          rankImageDetails={rankImageDetails}
        />

        <PickScreenOverlays
          block={block}
          key="hero-blocker-class"
          rankImageDetails={rankImageDetails}
          wl={wl}
        />

        <InGameOverlays
          key="in-game-overlays"
          block={block}
          wl={wl}
          rankImageDetails={rankImageDetails}
          paused={paused}
          roshan={roshan}
          setRoshan={setRoshan}
          setAegis={setAegis}
          aegis={aegis}
        />

        {isDev && (
          <Image
            key="dev-image"
            width={width}
            height={height}
            alt={`main game`}
            src={`/images/dev/in-game.png`}
          />
        )}
      </AnimatePresence>
    </>
  )
}
