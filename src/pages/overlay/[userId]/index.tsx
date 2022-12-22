'use client'

import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import io from 'socket.io-client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { fetcher } from '@/lib/fetcher'
import {
  DBSettings,
  defaultSettings,
  getValueOrDefault,
} from '@/lib/DBSettings'
import { getRankImage, RankDeets } from '@/lib/ranks'
import { Rankbadge } from '@/components/Rankbadge'
import { HeroBlocker } from '@/components/HeroBlocker'
import Countdown, { zeroPad } from 'react-countdown'
import { Card } from '@/components/Card'
import WinLossCard from '@/components/WinLossCard'

let socket

export default function OverlayPage() {
  const router = useRouter()
  const { userId } = router.query

  const [data, setData] = useState(null)
  const [paused, setPaused] = useState(false)
  const [scene, setScene] = useState({
    name: '',
    width: 1920,
    height: 1080,
  })
  const [wl, setWL] = useState([
    {
      win: 0,
      lose: 0,
      type: 'U',
    },
  ])

  const [rankImageDetails, setRankImageDetails] = useState({
    image: '0.png',
    rank: 0,
    leaderboard: false,
  })

  // On first load / refresh
  useEffect(() => {
    if (!userId) return

    fetcher(`/api/settings/?id=`, userId).then(setData)
  }, [userId])

  const [block, setBlock] = useState({ type: null, team: null })
  const time = new Date().getTime()
  const isDev = process.env.NODE_ENV === 'development'
  const devMin = isDev ? new Date(time + 300000).toISOString() : ''
  const devMax = isDev ? new Date(time + 600000).toISOString() : ''
  const [roshan, setRoshan] = useState({
    minS: isDev ? 600 : 0,
    maxS: isDev ? 600 : 0,
    minDate: devMin,
    maxDate: devMax,
  })

  const transformRes = ({ height = 0, width = 0 }) => {
    const defaultWidth = 1920
    const defaultHeight = 1080

    const widthRatio = (scene?.width || defaultWidth) / defaultWidth
    const heightRatio = (scene?.height || defaultHeight) / defaultHeight

    if (height) {
      return height * heightRatio || height
    }

    return width * widthRatio || width
  }

  const aegisRender = ({ minutes, seconds, completed }) => {
    if (completed) {
      return null
    }
    return (
      <div className="flex flex-col items-center">
        <Image
          className="animate-pulse"
          src="/images/aegis-icon.png"
          height={transformRes({ height: 42 })}
          width={transformRes({ width: 42 })}
          alt="aegis icon"
        />
        <span
          className="-mt-1 text-white/90"
          style={{
            fontSize: transformRes({ height: 14 }),
          }}
        >
          {minutes}:{zeroPad(seconds)}
        </span>
      </div>
    )
  }

  const roshRender = ({ minutes, seconds, completed }) => {
    if (completed) {
      return null
    }

    return (
      <div className="flex flex-col items-center">
        <Image
          src="/images/roshan-icon.png"
          height={transformRes({ height: 50 })}
          width={transformRes({ width: 33 })}
          alt="roshan icon"
          className="rounded-full"
        />
        <span
          className="-mt-1 text-white/90"
          style={{
            fontSize: transformRes({ height: 14 }),
          }}
        >
          {minutes}:{zeroPad(seconds)}
        </span>
      </div>
    )
  }

  const [aegis, setAegis] = useState({
    expireS: isDev ? 6 : 0,
    expireTime: '',
    expireDate: isDev ? devMin : '',
    playerId: isDev ? 1 : null,
  })
  const [connected, setConnected] = useState(false)

  const opts = defaultSettings
  // Replace defaults with settings from DB
  Object.values(DBSettings).forEach((key) => {
    // @ts-ignore ???
    opts[key] = getValueOrDefault(data?.settings, key)
  })

  const shouldBlockMap = opts[DBSettings.mblock] && block.type === 'playing'
  const shouldBlockPicks =
    opts[DBSettings.pblock] && ['picks', 'strategy'].includes(block.type)
  const countdownRef = useRef<Countdown>()
  const aegisRef = useRef<Countdown>()

  useEffect(() => {
    if (paused) {
      countdownRef.current?.api?.pause()
      aegisRef.current?.api?.pause()
    } else {
      countdownRef.current?.api?.start()
      aegisRef.current?.api?.start()
    }
  }, [paused])

  useEffect(() => {
    if (!userId) return

    console.log('Connecting to socket init...')

    socket = io(process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL, {
      auth: { token: userId },
    })

    socket.on('block', setBlock)
    socket.on('paused', setPaused)
    socket.on('aegis-picked-up', setAegis)
    socket.on('roshan-killed', setRoshan)
    socket.on('connect', () => {
      console.log('Connected to socket!', socket.id)

      return setConnected(true)
    })
    socket.on('disconnect', (reason) => {
      console.log('Disconnected from sockets:', reason)
      setConnected(false)

      if (reason === 'io server disconnect') {
        console.log('Reconnecting...')
        // the disconnection was initiated by the server, you need to reconnect manually
        socket.connect()
      }
    })

    socket.on('refresh-settings', () => {
      console.log('refreshing settings')

      fetcher(`/api/settings/?id=`, userId).then(setData)
    })

    socket.on('update-medal', (deets: RankDeets) => {
      getRankImage(deets).then(setRankImageDetails)
    })

    socket.on('update-wl', (records: typeof wl) => {
      setWL(records)
    })

    socket.on('refresh', () => {
      router.reload()
    })

    socket.on('connect_error', console.log)
  }, [router, userId])

  useEffect(() => {
    if (!userId || !opts[DBSettings.obs]) {
      return
    }

    if (!connected) {
      console.log(
        'Socket not connected just yet, will not run OBS scene switchers'
      )

      return
    }

    console.log('Connected to socket! Running OBS scene switchers')

    // Only run in OBS browser source
    if (
      !opts[DBSettings.obs] ||
      typeof window !== 'object' ||
      !window?.obsstudio
    )
      return

    console.log('OBS studio is connected')

    window.obsstudio.getCurrentScene(function (scene) {
      const myScenes = [
        opts[DBSettings.obsMinimap],
        opts[DBSettings.obsPicks],
        opts[DBSettings.obsDc],
      ]

      setScene(scene)

      // Some people don't enable the permissions
      if (typeof window.obsstudio.setCurrentScene !== 'function') return

      if (shouldBlockMap) {
        window.obsstudio.setCurrentScene(opts[DBSettings.obsMinimap])
        return
      }
      if (shouldBlockPicks) {
        window.obsstudio.setCurrentScene(opts[DBSettings.obsPicks])
        return
      }

      // Streamer has a custom scene, lets not override it
      // This allows streamers to make a scene for playing other games, and having
      // dota in the background wont switch scenes on them
      if (myScenes.includes(scene?.name)) {
        window.obsstudio.setCurrentScene(opts[DBSettings.obsDc])
        return
      }
    })
  }, [connected, userId, shouldBlockMap, shouldBlockPicks, opts])

  useEffect(() => {
    return () => {
      socket?.off('block')
      socket?.off('update-medal')
      socket?.off('connect')
      socket?.off('connect_error')
      socket?.disconnect()
    }
  }, [])

  const leftPositions = [
    555, 615, 680, 745, 800, 1065, 1130, 1192, 1250, 1320,
  ].map((w) => transformRes({ width: w }))

  let badgePosition = {
    bottom: 0,
    right: transformRes({ width: 276 }),
    left: null,
  }

  let wlPosition = {
    bottom: 0,
    right: transformRes({ width: 360 }),
    left: null,
    fontSize: transformRes({ width: 22 }),
  }

  let roshPosition = {
    left: opts[DBSettings.xl]
      ? transformRes({ width: 285 })
      : transformRes({ width: 250 }),
    bottom: transformRes({ height: 100 }),
    right: null,
  }

  let minimapPosition = {
    bottom: 0,
    left: 0,
    right: null,
  }

  if (opts[DBSettings.bp]) {
    minimapPosition.bottom += transformRes({ height: 9 })
    minimapPosition.left += transformRes({ width: 9 })
    roshPosition.left = opts[DBSettings.xl]
      ? transformRes({ width: 290 })
      : transformRes({ width: 255 })
  }

  if (opts[DBSettings.minimapRight]) {
    roshPosition.right = roshPosition.left
    roshPosition.left = null

    minimapPosition.right = minimapPosition.left
    minimapPosition.left = null

    wlPosition.left = wlPosition.right
    wlPosition.right = null

    badgePosition.left = badgePosition.right
    badgePosition.right = null

    if (opts[DBSettings.bp]) {
      minimapPosition.right += transformRes({ width: -3 })
      minimapPosition.bottom += transformRes({ height: -5 })
    }
  }

  return (
    <>
      <Head>
        <title>Dotabod | Stream overlays</title>
      </Head>
      <div>
        {block?.type === 'spectator' && (
          <div
            className="absolute"
            style={{
              bottom: opts[DBSettings.xl]
                ? transformRes({ height: 300 })
                : transformRes({ height: 260 }),
              left: 0,
            }}
          >
            <Card
              style={{
                fontSize: transformRes({ width: 16 }),
              }}
            >
              Spectating a match
            </Card>
          </div>
        )}

        {opts[DBSettings.rosh] &&
          (block.type === 'playing' || isDev) &&
          roshan?.maxDate && (
            <div style={roshPosition} className="absolute">
              {roshan?.minDate && (
                <div className="rounded-full bg-red-900/70">
                  <CountdownCircleTimer
                    isPlaying={!paused}
                    duration={roshan?.minS}
                    colors="#ff0000"
                    trailColor="#0000000"
                    size={transformRes({ width: 55 })}
                    strokeWidth={transformRes({ width: 3 })}
                  >
                    {({ remainingTime }) => (
                      <Countdown
                        ref={countdownRef}
                        date={roshan?.minDate}
                        renderer={roshRender}
                        onComplete={() => {
                          setRoshan({
                            ...roshan,
                            minDate: '',
                            minS: 0,
                          })
                        }}
                      />
                    )}
                  </CountdownCircleTimer>
                </div>
              )}
              {!roshan?.minDate && roshan?.maxDate && (
                <div className="rounded-full bg-yellow-800/70">
                  <CountdownCircleTimer
                    isPlaying={!paused}
                    duration={roshan?.maxS}
                    colors="#a39800"
                    size={transformRes({ width: 55 })}
                    strokeWidth={transformRes({ width: 3 })}
                  >
                    {({ remainingTime }) => (
                      <Countdown
                        ref={countdownRef}
                        date={roshan?.maxDate}
                        renderer={roshRender}
                        onComplete={() => {
                          setRoshan({
                            minS: 0,
                            minDate: '',
                            maxDate: '',
                            maxS: 0,
                          })
                        }}
                      />
                    )}
                  </CountdownCircleTimer>
                </div>
              )}
            </div>
          )}

        {opts[DBSettings.aegis] &&
          (block.type === 'playing' || isDev) &&
          aegis.expireDate && (
            <div
              style={{
                left: leftPositions[aegis.playerId],
                top: transformRes({ height: 65 }),
              }}
              className={`absolute text-white/90`}
            >
              <Countdown
                date={aegis.expireDate}
                renderer={aegisRender}
                ref={aegisRef}
                onComplete={() => {
                  setAegis({
                    expireS: 0,
                    expireTime: '',
                    expireDate: '',
                    playerId: null,
                  })
                }}
              />
            </div>
          )}

        {shouldBlockMap && (
          <Image
            className="absolute"
            priority
            alt="minimap blocker"
            width={
              opts[DBSettings.xl]
                ? transformRes({ width: 280 })
                : transformRes({ width: 240 })
            }
            height={
              opts[DBSettings.xl]
                ? transformRes({ height: 280 })
                : transformRes({ height: 240 })
            }
            style={minimapPosition}
            src={`/images/731-${
              opts[DBSettings.simple] ? 'Simple' : 'Complex'
            }-${opts[DBSettings.xl] ? 'X' : ''}Large-AntiStreamSnipeMap.png`}
          />
        )}

        {shouldBlockPicks && (
          <HeroBlocker
            transformRes={transformRes}
            type={block?.type}
            teamName={block?.team}
          />
        )}

        {['spectator', 'playing', 'arcade'].includes(block.type) && (
          <>
            {opts[DBSettings.commandWL] && (
              <div className="absolute" style={wlPosition}>
                <WinLossCard wl={wl} />
              </div>
            )}

            {opts[DBSettings.mmrTracker] && rankImageDetails?.rank > 0 && (
              <div className="absolute" style={badgePosition}>
                <Rankbadge {...rankImageDetails} transformRes={transformRes} />
              </div>
            )}
          </>
        )}

        {process.env.NODE_ENV === 'development' && (
          <Image
            height={transformRes({ height: 1080 })}
            width={transformRes({ width: 1920 })}
            alt={`main game`}
            src={`/images/shot_0012.png`}
          />
        )}
      </div>
    </>
  )
}
