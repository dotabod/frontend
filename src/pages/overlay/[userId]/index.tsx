'use client'

import { Card } from '@/components/Card'
import { HeroBlocker } from '@/components/HeroBlocker'
import { Rankbadge } from '@/components/Rankbadge'
import WinLossCard from '@/components/WinLossCard'
import {
  DBSettings,
  defaultSettings,
  getValueOrDefault,
} from '@/lib/DBSettings'
import { fetcher } from '@/lib/fetcher'
import { getRankImage, RankDeets } from '@/lib/ranks'
import clsx from 'clsx'
import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import Countdown, { zeroPad } from 'react-countdown'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import io from 'socket.io-client'

let socket

// add ordinal string to count variable
const ordinal = (count) => {
  const j = count % 10,
    k = count % 100
  if (j == 1 && k != 11) {
    return count + 'st'
  }
  if (j == 2 && k != 12) {
    return count + 'nd'
  }
  if (j == 3 && k != 13) {
    return count + 'rd'
  }
  return count + 'th'
}

const heroPosition = (teamName: string, i: number) => ({
  top: 4,
  right: teamName === 'radiant' ? null : 115 + i * 125,
  left: teamName === 'dire' ? null : 115 + i * 125,
  height: 55,
  width: 55,
})

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
    count: isDev ? 1 : 0,
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
          src="/images/rosh/aegis-icon-glow.png"
          width={transformRes({ width: 67 })}
          height={transformRes({ height: 1 })}
          alt="aegis icon"
        />
        <span
          className=" z-10 text-white/90"
          style={{
            marginLeft: transformRes({ width: 11 }),
            marginTop: transformRes({ height: -19 }),
            fontSize: transformRes({ height: 14 }),
          }}
        >
          {minutes}:{zeroPad(seconds)}
        </span>
      </div>
    )
  }

  const roshRender = ({ minutes, seconds, completed, color, count }) => {
    if (completed) {
      return null
    }

    return (
      <div className="flex flex-col items-center">
        {count > 0 && (
          <span
            className="absolute z-40 text-white/90"
            style={{
              top: transformRes({ height: -5 }),
              left: transformRes({ width: 0 }),
              fontSize: transformRes({ height: 16 }),
              fontWeight: 500,
            }}
          >
            {ordinal(count)}
          </span>
        )}
        <Image
          src="/images/rosh/roshan_timer_bg_psd1.png"
          height={transformRes({ height: 95 })}
          width={transformRes({ width: 95 })}
          style={{
            left: transformRes({ width: 0 }),
            top: transformRes({ height: 0 }),
            height: transformRes({ height: 70 }),
            width: transformRes({ width: 70 }),
            maxWidth: transformRes({ width: 70 }),
          }}
          alt="main bg"
          className="absolute z-0"
        />
        <Image
          src="/images/rosh/icon_roshan_timerbackground_norosh_psd.png"
          height={transformRes({ height: 40 })}
          width={transformRes({ width: 40 })}
          style={{ top: transformRes({ height: 8 }) }}
          alt="red glow"
          className={clsx(
            'absolute z-10',
            color === 'yellow' && 'hue-rotate-60'
          )}
        />
        <Image
          src="/images/rosh/roshan_timer_roshan_psd.png"
          height={transformRes({ height: 28 })}
          width={transformRes({ width: 28 })}
          alt="roshan icon"
          className="absolute z-20"
          style={{
            top: transformRes({ height: 8 }),
            left: transformRes({ height: 13 }),
          }}
        />
        <span
          className="absolute z-40 text-white/90"
          style={{
            bottom: transformRes({ height: 8 }),
            fontSize: transformRes({ height: 12 }),
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
    opts[key] = getValueOrDefault(key, data?.settings)
  })

  const shouldBlockMap =
    opts[DBSettings['minimap-blocker']] && block.type === 'playing'
  const shouldBlockPicks =
    opts[DBSettings['picks-blocker']] &&
    ['picks', 'strategy'].includes(block.type)
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
    if (!userId || !opts[DBSettings['obs-scene-switcher']]) {
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
      !opts[DBSettings['obs-scene-switcher']] ||
      typeof window !== 'object' ||
      !window?.obsstudio
    )
      return

    console.log('OBS studio is connected')

    window.obsstudio.getCurrentScene(function (scene) {
      const myScenes = [
        opts[DBSettings['obs-minimap']],
        opts[DBSettings['obs-picks']],
        opts[DBSettings['obs-dc']],
      ]

      setScene(scene)

      // Some people don't enable the permissions
      if (typeof window.obsstudio.setCurrentScene !== 'function') return

      if (shouldBlockMap) {
        window.obsstudio.setCurrentScene(opts[DBSettings['obs-minimap']])
        return
      }
      if (shouldBlockPicks) {
        window.obsstudio.setCurrentScene(opts[DBSettings['obs-picks']])
        return
      }

      // Streamer has a custom scene, lets not override it
      // This allows streamers to make a scene for playing other games, and having
      // dota in the background wont switch scenes on them
      if (myScenes.includes(scene?.name)) {
        window.obsstudio.setCurrentScene(opts[DBSettings['obs-dc']])
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
  ].map((w) => transformRes({ width: w - 20 }))

  let badgePosition = {
    bottom: 0,
    right: transformRes({ width: 276 }),
    left: null,
  }

  let wlPosition = {
    bottom: 0,
    right: transformRes({ width: 356 }),
    left: null,
    fontSize: transformRes({ width: 22 }),
  }

  const isSimple = opts[DBSettings['minimap-simple']]
  const isXL = opts[DBSettings['minimap-xl']]
  const isBp = opts[DBSettings.battlepass]

  let roshPosition = {
    left: isXL
      ? transformRes({ width: isSimple ? 280 : 285 })
      : transformRes({ width: isSimple ? 243 : 250 }),
    bottom: transformRes({ height: 100 }),
    right: null,
  }

  let minimapPosition = {
    bottom: 0,
    left: 0,
    right: null,
  }

  if (isBp) {
    minimapPosition.bottom += transformRes({ height: 9 })
    minimapPosition.left += transformRes({ width: 9 })
    roshPosition.left = isXL
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

    if (isBp) {
      minimapPosition.right += transformRes({ width: -3 })
      minimapPosition.bottom += transformRes({ height: -5 })
    }
  }

  return (
    <>
      <Head>
        <title>Dotabod | Stream overlays</title>
      </Head>
      <style global jsx>{`
        .rosh-timer svg {
          position: absolute;
          z-index: 30;
          top: ${transformRes({ height: 8 })}px;
          left: ${transformRes({ width: 5 })}px;
          height: ${transformRes({ height: 42 })}px;
          width: ${transformRes({ width: 42 })}px;
        }
        .rosh-timer > div {
          height: ${transformRes({ height: 55 })}px !important;
          width: ${transformRes({ width: 55 })}px !important;
        }
      `}</style>
      <div>
        {block?.type === 'spectator' && (
          <div
            className="absolute"
            style={{
              bottom: isXL
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
            <div style={roshPosition} className="rosh-timer absolute">
              {roshan?.minDate && (
                <CountdownCircleTimer
                  isPlaying={!paused}
                  duration={roshan?.minS}
                  colors="#ff0000"
                  trailColor="#0000000"
                  size={transformRes({ width: 45 })}
                  strokeWidth={transformRes({ width: 3 })}
                >
                  {({ remainingTime }) => (
                    <Countdown
                      ref={countdownRef}
                      date={roshan?.minDate}
                      renderer={(props) =>
                        roshRender({
                          ...props,
                          color: 'red',
                          count: roshan.count,
                        })
                      }
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
              )}
              {!roshan?.minDate && roshan?.maxDate && (
                <div className="rounded-full">
                  <CountdownCircleTimer
                    isPlaying={!paused}
                    duration={roshan?.maxS}
                    colors="#a39800"
                    trailColor="#0000000"
                    size={transformRes({ width: 55 })}
                    strokeWidth={transformRes({ width: 3 })}
                  >
                    {({ remainingTime }) => (
                      <Countdown
                        ref={countdownRef}
                        date={roshan?.maxDate}
                        renderer={(props) =>
                          roshRender({
                            ...props,
                            color: 'yellow',
                            count: roshan.count,
                          })
                        }
                        onComplete={() => {
                          setRoshan({
                            ...roshan,
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
              isXL ? transformRes({ width: 280 }) : transformRes({ width: 240 })
            }
            height={
              isXL
                ? transformRes({ height: 280 })
                : transformRes({ height: 240 })
            }
            style={minimapPosition}
            src={`/images/731-${isSimple ? 'Simple' : 'Complex'}-${
              isXL ? 'X' : ''
            }Large-AntiStreamSnipeMap.png`}
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

            {opts[DBSettings['mmr-tracker']] && rankImageDetails?.rank > 0 && (
              <div className="absolute" style={badgePosition}>
                <Rankbadge {...rankImageDetails} transformRes={transformRes} />
              </div>
            )}
          </>
        )}

        {[null].includes(block.type) && (
          <>
            {opts[DBSettings.commandWL] && (
              <div
                className="absolute"
                style={{
                  ...wlPosition,
                  bottom: null,
                  top:
                    wl.length > 1
                      ? transformRes({ height: 5 })
                      : transformRes({ height: 17 }),
                  right: transformRes({ width: 600 }),
                }}
              >
                <WinLossCard wl={wl} mainScreen />
              </div>
            )}

            {opts[DBSettings['mmr-tracker']] && rankImageDetails?.rank > 0 && (
              <div
                className="absolute"
                style={{
                  ...badgePosition,
                  bottom: null,
                  top: transformRes({ height: 5 }),
                  right: transformRes({ width: 480 }),
                }}
              >
                <Rankbadge
                  {...rankImageDetails}
                  mainScreen
                  transformRes={transformRes}
                />
              </div>
            )}
          </>
        )}

        {isDev && (
          <Image
            width={transformRes({ width: 1920 })}
            height={transformRes({ height: 1080 })}
            alt={`main game`}
            src={`/images/rosh/draskyl.png`}
          />
        )}
      </div>
    </>
  )
}
