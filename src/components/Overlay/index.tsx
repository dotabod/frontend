import { AnimatePresence, motion } from 'framer-motion'
import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { PickScreenOverlays } from '@/components/Overlay/blocker/PickScreenOverlays'
import { useAegis, useRoshan } from '@/lib/hooks/rosh'
import { devRadiantWinChance, isDev } from '@/lib/devConsts'
import { useSocket, WinChance } from '@/lib/hooks/useSocket'
import { useOBS } from '@/lib/hooks/useOBS'
import { useWindowSize } from '@/lib/hooks/useWindowSize'
import { InGameOverlays } from '@/components/Overlay/InGameOverlays'
import { MainScreenOverlays } from '@/components/Overlay/MainScreenOverlays'
import { PollOverlays } from '@/components/Overlay/PollOverlays'
import {
  blockType,
  devBlockTypes,
  devPoll,
  devRank,
  devWL,
} from '@/lib/devConsts'
import { PollData } from '@/components/Overlay/PollOverlay'
import { Center } from '@mantine/core'
import clsx from 'clsx'
import { motionProps } from '@/ui/utils'
import { useNotablePlayers } from '@/lib/hooks/useNotablePlayers'
import { Alert, Spin } from 'antd'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'

const OverlayPage = (props) => {
  const { data: isDotabodDisabled } = useUpdateSetting(Settings.commandDisable)
  const { height, width } = useWindowSize()
  const [connected, setConnected] = useState(false)

  const [block, setBlock] = useState<blockType>({
    matchId: null,
    team: null,
    type: null,
  })
  const [pollData, setPollData] = useState<PollData | null>()
  const [betData, setBetData] = useState<{
    title: string
    endDate: string
    outcomes: { title: string; totalVotes: number; channelPoints: number }[]
  } | null>(null)
  const [paused, setPaused] = useState(false)
  const { roshan, setRoshan } = useRoshan()
  const { aegis, setAegis } = useAegis()
  const { notablePlayers, setNotablePlayers } = useNotablePlayers()
  const [wl, setWL] = useState([
    {
      win: 0,
      lose: 0,
      type: 'U',
    },
  ])
  const [radiantWinChance, setRadiantWinChance] = useState<WinChance>(null)

  const [rankImageDetails, setRankImageDetails] = useState({
    image: '0.png',
    rank: 0,
    leaderboard: false,
    notLoaded: true,
  })

  const [isInIframe, setIsInIframe] = useState(false)

  useEffect(() => {
    setIsInIframe(window.self !== window.top)
  }, [])

  useEffect(() => {
    if (!isDev) return
    setWL(devWL)
    setPollData(devPoll)
    setBlock(devBlockTypes)
    setRankImageDetails(devRank)
    setRadiantWinChance(devRadiantWinChance)
  }, [isDev])

  useSocket({
    setAegis,
    setBlock,
    setConnected,
    setPaused,
    setRankImageDetails,
    setRoshan,
    setPollData,
    setBetData,
    setNotablePlayers,
    setWL,
    setRadiantWinChance,
  })

  useOBS({ block, connected })

  if (isDotabodDisabled) {
    return isDev ? (
      <>
        <motion.div
          className={clsx('absolute right-0 mt-9 block max-w-xs')}
          key="not-live"
          {...motionProps}
        >
          <Alert message="Dotabod is disabled!" />
        </motion.div>
        <Image
          key="dev-image"
          width={width}
          height={height}
          alt={`${block.type} dev screenshot`}
          src={`/images/dev/${
            block.type === 'spectator' ? 'playing' : block.type
          }.png`}
        />
      </>
    ) : null
  }

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
          <div
            className={clsx(
              'hidden',
              isInIframe && rankImageDetails?.notLoaded ? '!block' : '',
            )}
          >
            <Center style={{ height }}>
              <div className="space-y-6 rounded-md bg-gray-300 p-4">
                <Spin spinning>
                  <div className="flex text-center">
                    <div className="ml-3">
                      <h3 className="text-2xl font-medium text-gray-800">
                        Waiting for Dota
                      </h3>
                      <div className="mt-2 text-lg text-gray-700">
                        <p>Dotabod hasn&apos;t detected your game yet.</p>
                      </div>
                    </div>
                  </div>
                </Spin>
              </div>
            </Center>
          </div>
        </motion.div>

        <PollOverlays
          pollData={pollData}
          setBetData={setBetData}
          setPollData={setPollData}
          betData={betData}
          radiantWinChance={radiantWinChance}
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
          notablePlayers={notablePlayers}
        />

        {isDev && (
          <Image
            key="dev-image"
            width={width}
            height={height}
            alt={`${block.type} dev screenshot`}
            src={`/images/dev/${
              block.type === 'spectator' ? 'playing' : block.type
            }.png`}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default OverlayPage
