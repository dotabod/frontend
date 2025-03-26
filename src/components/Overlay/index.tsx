import { InGameOverlays } from '@/components/Overlay/InGameOverlays'
import { MainScreenOverlays } from '@/components/Overlay/MainScreenOverlays'
import type { PollData } from '@/components/Overlay/PollOverlay'
import { PollOverlays } from '@/components/Overlay/PollOverlays'
import { PickScreenOverlays } from '@/components/Overlay/blocker/PickScreenOverlays'
import { GiftAlert } from '@/components/Overlay/GiftAlert'
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
import { Alert, App, InputNumber, Select, Spin } from 'antd'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import { RestrictFeature } from '../RestrictFeature'
import { OverlayV2 } from './blocker/PickBlockerV2'
import { AnimatedLastFm } from './lastfm/AnimatedLastFm'

const DevControls = ({
  block,
  setBlock,
}: { block: blockType; setBlock: (block: blockType) => void }) => {
  if (!isDev) return null

  const { data: refreshRate, updateSetting } = useUpdateSetting<number>(Settings.lastFmRefreshRate)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleTeamChange = (value: 'radiant' | 'dire' | null) => {
    setBlock({ ...block, team: value })
  }

  const handleTypeChange = (value: blockType['type']) => {
    setBlock({ ...block, type: value })
  }

  const handleIntervalChange = (value: number | null) => {
    if (value) {
      updateSetting(value)
    }
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    },
    [position],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        })
      }
    },
    [isDragging, dragStart],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <motion.div
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        position: 'fixed',
        top: '1rem',
        left: '1rem',
        zIndex: 50,
      }}
      className='flex flex-col gap-3 p-4 rounded-lg shadow-lg bg-gray-900/80 backdrop-blur-md'
    >
      <div
        onMouseDown={handleMouseDown}
        className='absolute top-0 right-0 left-0 h-6 bg-gray-800/50 rounded-t-lg flex items-center justify-center text-xs text-gray-400 cursor-move select-none'
      >
        Drag to move
      </div>

      {/* Block controls group */}
      <div className='flex flex-col gap-2 mt-4'>
        <div className='text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
          Block Controls
        </div>
        <div className='flex gap-2'>
          <Select
            value={block.team}
            onChange={handleTeamChange}
            options={[
              { value: 'radiant', label: 'Radiant' },
              { value: 'dire', label: 'Dire' },
              { value: null, label: 'None' },
            ]}
            style={{ width: 120 }}
            placeholder='Select team'
          />
          <Select
            value={block.type}
            onChange={handleTypeChange}
            options={[
              { value: 'picks', label: 'Picks' },
              { value: 'playing', label: 'Playing' },
              { value: 'strategy', label: 'Strategy' },
              { value: 'strategy-2', label: 'Strategy 2' },
              { value: 'spectator', label: 'Spectator' },
              { value: null, label: 'None' },
            ]}
            style={{ width: 120 }}
            placeholder='Select type'
          />
        </div>
      </div>

      {/* LastFM settings group */}
      <div className='flex flex-col gap-2'>
        <div className='text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
          LastFM Settings
        </div>
        <InputNumber
          value={typeof refreshRate === 'number' ? refreshRate : 30}
          onChange={handleIntervalChange}
          min={1}
          max={300}
          style={{ width: 120 }}
          addonAfter='sec'
          placeholder='LastFM interval'
        />
      </div>
    </motion.div>
  )
}

const OverlayPage = () => {
  const { data: showGiftAlerts } = useUpdateSetting(Settings.showGiftAlerts)
  const { notification } = App.useApp()
  const { data: isDotabodDisabled } = useUpdateSetting(Settings.commandDisable)
  const { original, error } = useUpdateSetting()
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
      leaderboard: 'standing' in rank ? rank.standing : (steamAccount?.leaderboard_rank ?? false),
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
    if (!is404) {
      Sentry.captureException(new Error('Error in overlay page fetching settings'), {
        extra: {
          error,
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
          src={`/images/dev/${width && height && Math.round((width / height) * 9) === 21 ? '21-9-' : ''}${block.type === 'spectator' ? 'playing' : (block.type ?? 'main-menu')}.png`}
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
      <DevControls block={block} setBlock={setBlock} />
      {showGiftAlerts && <GiftAlert />}
      <AnimatePresence>
        {connected !== true && (
          <Center
            key='connecting-spinner'
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 9999,
            }}
          >
            <Spin size='large' tip='Connecting to Dotabod...' />
          </Center>
        )}
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

          <MainScreenOverlays
            key='main-screen-overlays'
            block={block}
            wl={wl}
            rankImageDetails={rankImageDetails}
          />

          <PickScreenOverlays
            block={block}
            key='hero-blocker-class'
            rankImageDetails={rankImageDetails}
            wl={wl}
          />
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

        <OverlayV2>
          <RestrictFeature feature='lastFmOverlay'>
            <AnimatedLastFm block={block} />
          </RestrictFeature>
        </OverlayV2>

        {isDev && (
          <Image
            key='dev-image'
            width={width}
            height={height}
            alt={`${block.type} dev screenshot`}
            src={`/images/dev/${width && height && Math.round((width / height) * 9) === 21 ? '21-9-' : ''}${block.type === 'spectator' ? 'playing' : (block.type ?? 'main-menu')}.png`}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default OverlayPage
