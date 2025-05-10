import { InGameOverlays } from '@/components/Overlay/InGameOverlays'
import { MainScreenOverlays } from '@/components/Overlay/MainScreenOverlays'
import type { PollData } from '@/components/Overlay/PollOverlay'
import { PollOverlays } from '@/components/Overlay/PollOverlays'
import { PickScreenOverlays } from '@/components/Overlay/blocker/PickScreenOverlays'
import { Settings } from '@/lib/defaultSettings'
import {
  type blockType,
  devBlockTypes,
  devPoll,
  devRadiantWinChance,
  devRank,
  devWL,
  isDev,
} from '@/lib/devConsts'
import { useAegis, useRoshan } from '@/lib/hooks/rosh'
import { useNotablePlayers } from '@/lib/hooks/useNotablePlayers'
import { useOBS } from '@/lib/hooks/useOBS'
import { type WinChance, useSocket } from '@/lib/hooks/useSocket'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useWindowSize } from '@/lib/hooks/useWindowSize'
import { getRankDetail } from '@/lib/ranks'
import { motionProps } from '@/ui/utils'
import { Center } from '@mantine/core'
import * as Sentry from '@sentry/nextjs'
import { Alert, App, Spin } from 'antd'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { RestrictFeature } from '../RestrictFeature'
import { DevControls, DevModeToggle } from './DevControls'
import { OverlayV2 } from './blocker/PickBlockerV2'
import { AnimatedLastFm } from './lastfm/AnimatedLastFm'

const OverlayPage = () => {
  const { data: showGiftAlerts } = useUpdateSetting(Settings.showGiftAlerts)
  const { notification } = App.useApp()
  const { data: isDotabodDisabled } = useUpdateSetting(Settings.commandDisable)
  const { original, error } = useUpdateSetting()
  const { height, width } = useWindowSize()
  const [connected, setConnected] = useState(false)
  const [showDevImage, setShowDevImage] = useState(true)
  const [showMainScreenOverlay, setShowMainScreenOverlay] = useState(false)
  const isFirstLoad = useRef(true)
  const blockTypeChangeTimer = useRef<NodeJS.Timeout | null>(null)

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
  const [radiantWinChance, setRadiantWinChance] = useState<WinChance | null>(null)

  const [rankImageDetails, setRankImageDetails] = useState<{
    image: string | null
    rank: number | null
    leaderboard: number | null
    notLoaded?: boolean
  }>({
    image: '0.png',
    rank: 0,
    leaderboard: 0,
    notLoaded: true,
  })

  const [isInIframe, setIsInIframe] = useState(false)
  const is404 = error && typeof error === 'object' && 'status' in error && error.status === 404

  // Add detection for OBS environment
  const [isOldObs, setIsOldObs] = useState(false)
  useEffect(() => {
    // Check if running in OBS (older Chromium)
    const isOldOBS =
      // New OBS uses browser source/docks CEF (Chromium) version 127 (6533)
      // Check if we're running in an older version that needs compatibility
      Number.parseInt(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '999', 10) < 127

    setIsOldObs(isOldOBS)
  }, [])

  // Handle logic for showing MainScreenOverlays with a delay on first load
  useEffect(() => {
    // Clear any existing timers on component unmount or when block type changes
    if (blockTypeChangeTimer.current) {
      clearTimeout(blockTypeChangeTimer.current)
      blockTypeChangeTimer.current = null
    }

    if (isFirstLoad.current) {
      // On first load, wait 10 seconds before showing MainScreenOverlays
      if (connected) {
        blockTypeChangeTimer.current = setTimeout(() => {
          setShowMainScreenOverlay(true)
          isFirstLoad.current = false // No longer first load
        }, 10000)
      }
    } else {
      // After first load, show immediately
      setShowMainScreenOverlay(true)
    }

    return () => {
      if (blockTypeChangeTimer.current) {
        clearTimeout(blockTypeChangeTimer.current)
      }
    }
  }, [connected])

  // Refresh the page every 5 minutes if the socket is disconnected
  useEffect(() => {
    let reloadTimeout: NodeJS.Timeout | null = null

    if (!connected) {
      reloadTimeout = setTimeout(() => {
        window.location.reload()
      }, 300000)
    } else if (reloadTimeout) {
      clearTimeout(reloadTimeout)
    }

    return () => {
      if (reloadTimeout) {
        clearTimeout(reloadTimeout)
      }
    }
  }, [connected])

  useEffect(() => {
    if (!original) return

    const steamAccount = original.SteamAccount?.[0]
    const rank = getRankDetail(steamAccount?.mmr ?? original.mmr, steamAccount?.leaderboard_rank)

    if (!rank) return

    const rankDetails = {
      image: rank.myRank?.image ?? '0.png',
      rank: rank.mmr,
      leaderboard: 'standing' in rank ? rank.standing : steamAccount?.leaderboard_rank ?? false,
      notLoaded: false,
    }

    setRankImageDetails(rankDetails)
  }, [original])

  useEffect(() => {
    let reloadTimeout: NodeJS.Timeout | null = null

    if (original?.stream_online === false) {
      notification.open({
        key: 'stream-offline',
        type: 'error',
        duration: 0,
        placement: 'bottomLeft',
        message: 'Twitch stream is offline',
        description:
          'Dotabod is disabled until you go live on Twitch. Not streaming on Twitch? Type !online in your Twitch chat to enable Dotabod.',
      })

      // Refresh page every 5 minutes to check if stream is online
      reloadTimeout = setTimeout(() => {
        window.location.reload()
      }, 300000)
    } else {
      notification.destroy('stream-offline')
      if (reloadTimeout) {
        clearTimeout(reloadTimeout)
      }
    }

    return () => {
      if (reloadTimeout) {
        clearTimeout(reloadTimeout)
      }
    }
  }, [notification, original?.stream_online])

  useEffect(() => {
    setIsInIframe(window.self !== window.top)
  }, [])

  useEffect(() => {
    if (error && !is404) {
      Sentry.captureException(new Error('Error in overlay page fetching settings'), {
        extra: {
          errorFromHook: error,
          status: (error as any)?.status,
          message: (error as any)?.message,
          is404Calculated: is404,
          originalData: original,
        },
      })
    }

    if (is404) {
      notification.open({
        key: 'auth-error',
        type: 'error',
        duration: 0,
        placement: 'bottomLeft',
        message: 'Authentication failed',
        description: 'Please delete your overlay and setup Dotabod again by visiting dotabod.com',
      })
      // Capture a soft error to Sentry for 404 accounts
      Sentry.captureMessage('Account not found in overlay', {
        level: 'warning',
        extra: {
          error,
          originalData: original,
        },
      })
    } else {
      notification.destroy('auth-error')
    }
  }, [error, notification, is404, original])

  useEffect(() => {
    if (!isDev) return
    setWL(devWL)
    setPollData(devPoll)
    setBlock(devBlockTypes)
    setRankImageDetails(devRank)
    setRadiantWinChance(devRadiantWinChance)
  }, [])

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
          key='not-live'
          {...motionProps}
        >
          <Alert message='Dotabod is disabled!' />
        </motion.div>
        <Image
          key='dev-image'
          width={width}
          height={height}
          alt={`${block.type} dev screenshot`}
          src={`/images/dev/${width && height && Math.round((width / height) * 9) === 21 ? '21-9-' : ''}${block.type === 'spectator' ? 'playing' : block.type ?? 'main-menu'}.png`}
        />
      </>
    ) : null
  }

  if (is404) {
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
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Dotabod | Stream overlays</title>
        {isOldObs && <link rel='stylesheet' href='/styles/obs-compat.css' />}
      </Head>
      <style global jsx>{`
        html,
        body {
          overflow: hidden;
        }
      `}</style>
      <DevControls
        block={block}
        setBlock={setBlock}
        showDevImage={showDevImage}
        setShowDevImage={setShowDevImage}
      />
      <AnimatePresence>
        <motion.div
          key='not-detected'
          {...motionProps}
          style={{ display: isInIframe && rankImageDetails?.notLoaded ? 'block' : 'none' }}
        >
          <div id='not-detected'>
            <Center style={{ height }}>
              <div className='space-y-6 rounded-md bg-gray-300 p-4'>
                <Spin spinning>
                  <div className='flex text-center'>
                    <div className='ml-3'>
                      <h3 className='text-2xl font-medium text-gray-800'>Waiting for Dota</h3>
                      <div className='mt-2 text-lg text-gray-700'>
                        <p>Dotabod hasn&apos;t detected your game yet.</p>
                      </div>
                    </div>
                  </div>
                </Spin>
              </div>
            </Center>
          </div>
        </motion.div>

        <OverlayV2>
          <RestrictFeature feature='livePolls'>
            <PollOverlays
              pollData={pollData}
              setBetData={setBetData}
              setPollData={setPollData}
              betData={betData}
              radiantWinChance={radiantWinChance}
            />
          </RestrictFeature>

          {showMainScreenOverlay && (
            <MainScreenOverlays
              key='main-screen-overlays'
              block={block}
              wl={wl}
              rankImageDetails={rankImageDetails}
            />
          )}

          <PickScreenOverlays
            block={block}
            key='hero-blocker-class'
            rankImageDetails={rankImageDetails}
            wl={wl}
          />

          <RestrictFeature feature='lastFmOverlay'>
            <AnimatedLastFm block={block} />
          </RestrictFeature>
        </OverlayV2>

        <InGameOverlays
          key='in-game-overlays'
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

        {isDev && showDevImage && (
          <Image
            key='dev-image'
            width={width}
            height={height}
            alt={`${block.type} dev screenshot`}
            src={`/images/dev/${width && height && Math.round((width / height) * 9) === 21 ? '21-9-' : ''}${block.type === 'spectator' ? 'playing' : block.type ?? 'main-menu'}.png`}
          />
        )}
      </AnimatePresence>
      <DevModeToggle />
    </>
  )
}

export default OverlayPage
