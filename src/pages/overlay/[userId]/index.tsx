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
import { PollOverlays } from '@/components/Overlay/PollOverlays'

type PollData = {
  title: string
  endDate: number
  choices: { title: string; totalVotes?: number }[]
}

const devBlockTypes = {
  matchId: 123456789,
  team: 'radiant',
  type: null,
}

const devPoll: PollData = {
  endDate: new Date().getTime() + 1000 * 60 * 60 * 24,
  title: 'What is your favorite color?',
  choices: [
    {
      title: 'Blue',
      totalVotes: 500000,
    },
    {
      title: 'Red',
      totalVotes: 300000,
    },
  ],
}

const devRank = {
  image: '55.png',
  rank: 5500,
  leaderboard: false,
}

const devWL = [
  {
    win: 5,
    lose: 1,
    type: 'U',
  },
]

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
  const [pollData, setPollData] = useState<PollData | null>(
    isDev ? devPoll : null
  )
  const [betData, setBetData] = useState<{
    title: string
    endDate: string
    outcomes: { title: string; totalVotes: number; channelPoints: number }[]
  } | null>(null)
  const [paused, setPaused] = useState(false)
  const { roshan, setRoshan } = useRoshan()
  const { aegis, setAegis } = useAegis()
  const [wl, setWL] = useState(
    isDev
      ? devWL
      : [
          {
            win: 0,
            lose: 0,
            type: 'U',
          },
        ]
  )

  const [rankImageDetails, setRankImageDetails] = useState(
    isDev
      ? devRank
      : {
          image: '0.png',
          rank: 0,
          leaderboard: false,
        }
  )

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
        <PollOverlays
          pollData={pollData}
          betData={betData}
          key="poll-overlays"
        />

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
            alt={`${devBlockTypes.type} dev screenshot`}
            src={`/images/dev/${devBlockTypes.type}.png`}
          />
        )}
      </AnimatePresence>
    </>
  )
}
