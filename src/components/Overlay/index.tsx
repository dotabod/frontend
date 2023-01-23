import { AnimatePresence, motion } from 'framer-motion'
import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { PickScreenOverlays } from '@/components/Overlay/blocker/PickScreenOverlays'
import { isDev, useAegis, useRoshan } from '@/lib/hooks/rosh'
import { useSocket } from '@/lib/hooks/useSocket'
import { useOBS } from '@/lib/hooks/useOBS'
import { useWindowSize } from '@/lib/hooks/useWindowSize'
import { InGameOverlays } from '@/components/Overlay/InGameOverlays'
import { MainScreenOverlays } from '@/components/Overlay/MainScreenOverlays'
import { PollOverlays } from '@/components/Overlay/PollOverlays'
import { devBlockTypes, devPoll, devRank, devWL } from '@/lib/devConsts'
import { PollData } from '@/components/Overlay/PollOverlay'
import { Center, Container, Loader } from '@mantine/core'
import clsx from 'clsx'
import { motionProps } from '@/ui/utils'

const OverlayPage = (props) => {
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
  const [isInIframe, setIsInIframe] = useState(false)

  useEffect(() => {
    setIsInIframe(window.self !== window.top)
  }, [])

  const [rankImageDetails, setRankImageDetails] = useState(
    isDev
      ? devRank
      : {
          image: '0.png',
          rank: 0,
          leaderboard: false,
          notLoaded: true,
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
        <motion.div key="not-detected" {...motionProps}>
          <Container
            className={clsx(
              'hidden',
              isInIframe && rankImageDetails?.notLoaded ? '!block' : ''
            )}
          >
            <Center style={{ height }}>
              <div className="space-y-6 rounded-md bg-dark-300 p-4">
                <Center>
                  <Loader color="black" variant="bars" size="xl" />
                </Center>
                <div className="flex text-center">
                  <div className="ml-3">
                    <h3 className="text-2xl font-medium text-dark-800">
                      Waiting for Dota
                    </h3>
                    <div className="mt-2 text-lg text-dark-700">
                      <p>Dotabod hasn&apos;t detected your game yet.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Center>
          </Container>
        </motion.div>

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

export default OverlayPage
