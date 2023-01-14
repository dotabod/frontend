import { AnimatePresence } from 'framer-motion'
import { getValueOrDefault } from '@/lib/settings'
import { fetcher } from '@/lib/fetcher'
import { getRankImage, RankType } from '@/lib/ranks'
import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import Countdown from 'react-countdown'
import io from 'socket.io-client'
import { SpectatorText } from '@/components/Overlay/SpectatorText'
import { MinimapBlocker } from '@/components/Overlay/blocker/MinimapBlocker'
import { AnimateRosh } from '@/components/Overlay/rosh/AnimateRosh'
import { AnimateRankBadge } from '@/components/Overlay/rank/AnimateRankBadge'
import { AnimatedHeroBlocker } from '@/components/Overlay/blocker/AnimatedHeroBlocker'
import { AnimatedWLCard } from '@/components/Overlay/wl/AnimatedWLCard'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { AnimatedRank_Mainscreen } from '@/components/Overlay/rank/AnimatedRank_Mainscreen'
import { AnimatedAegis } from '@/components/Overlay/aegis/AnimatedAegis'
import { defaultSettings, Settings } from '@/lib/defaultSettings'
import { useWindowSize } from '@/lib/hooks'

let socket

export default function OverlayPage() {
  const isDev = process.env.NODE_ENV === 'development'

  const router = useRouter()
  const { userId } = router.query

  const [data, setData] = useState(null)
  const [paused, setPaused] = useState(false)
  const [scene, setScene] = useState({
    name: '',
    // set width to default window size of browser
    width: 1920,
    height: 1080,
  })
  const windowSize = useWindowSize()

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

  // On first load / refresh
  useEffect(() => {
    if (!userId) return

    fetcher(`/api/settings/?id=`, userId).then(setData)
  }, [userId])

  const [block, setBlock] = useState({ type: null, team: null, matchId: null })
  const time = new Date().getTime()
  const devMin = isDev ? new Date(time + 5000).toISOString() : ''
  const devMax = isDev
    ? new Date(new Date(time + 5000).getTime() + 5000).toISOString()
    : ''
  const [roshan, setRoshan] = useState({
    minS: isDev ? 5000 / 1000 : 0,
    maxS: isDev ? 5000 / 1000 : 0,
    minDate: devMin,
    maxDate: devMax,
    count: isDev ? 1 : 0,
  })

  const transformRes = ({ height = 0, width = 0 }) => {
    const defaultWidth = 1920
    const defaultHeight = 1080

    const widthRatio = (windowSize?.width || defaultWidth) / defaultWidth
    const heightRatio = (windowSize?.height || defaultHeight) / defaultHeight

    if (height) {
      return height * heightRatio || height
    }

    return width * widthRatio || width
  }

  const [aegis, setAegis] = useState({
    expireS: isDev ? 6 : 0,
    expireTime: '',
    expireDate: isDev ? devMin : '',
    playerId: isDev ? 5 : null,
  })
  const [connected, setConnected] = useState(false)

  const opts = defaultSettings
  // Replace defaults with settings from DB
  Object.values(Settings).forEach((key) => {
    // @ts-ignore ???
    opts[key] = getValueOrDefault(key, data?.settings)
  })

  const shouldBlockMap =
    opts[Settings['minimap-blocker']] && block.type === 'playing'
  const shouldBlockPicks =
    opts[Settings['picks-blocker']] &&
    ['picks', 'strategy', 'strategy-2'].includes(block.type)
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

    socket.on('update-medal', (deets: RankType) => {
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
    if (!userId || !opts[Settings['obs-scene-switcher']]) {
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
      !opts[Settings['obs-scene-switcher']] ||
      typeof window !== 'object' ||
      !window?.obsstudio
    )
      return

    window.obsstudio.getCurrentScene(function (scene) {
      const myScenes = [
        opts[Settings['obs-minimap']],
        opts[Settings['obs-picks']],
        opts[Settings['obs-dc']],
      ]

      setScene(scene)

      // Some people don't enable the permissions
      if (typeof window.obsstudio.setCurrentScene !== 'function') return

      if (block.type === 'playing') {
        window.obsstudio.setCurrentScene(opts[Settings['obs-minimap']])
        return
      }
      if (['picks', 'strategy', 'strategy-2'].includes(block.type)) {
        window.obsstudio.setCurrentScene(opts[Settings['obs-picks']])
        return
      }

      // Streamer has a custom scene, lets not override it
      // This allows streamers to make a scene for playing other games, and having
      // dota in the background wont switch scenes on them
      if (myScenes.includes(scene?.name)) {
        window.obsstudio.setCurrentScene(opts[Settings['obs-dc']])
        return
      }
    })
  }, [connected, userId, opts, block.type])

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
    top: null,
  }

  let wlPosition = {
    bottom: 0,
    right: transformRes({ width: 356 }),
    left: null,
    fontSize: transformRes({ width: 22 }),
  }

  const isSimple = opts[Settings['minimap-simple']]
  const isXL = opts[Settings['minimap-xl']]
  const isBp = opts[Settings.battlepass]

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

  if (opts[Settings.minimapRight]) {
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
        // remove scrollbars from main divs
        html,
        body {
          overflow: hidden;
        }
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
      <AnimatePresence>
        {block?.type === 'spectator' && (
          <SpectatorText
            block={block}
            transformRes={transformRes}
            isXL={isXL}
          />
        )}

        {opts[Settings.rosh] && (block.type === 'playing' || isDev) && (
          <AnimateRosh
            key="animate-rosh-class"
            style={roshPosition}
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
            transformRes={transformRes}
            countdownRef={countdownRef}
          />
        )}

        {opts[Settings.aegis] &&
          (block.type === 'playing' || isDev) &&
          aegis.expireDate && (
            <AnimatedAegis
              key="animate-aegis-class"
              numbers={leftPositions}
              aegis={aegis}
              top={transformRes({ height: 65 })}
              transformRes={transformRes}
              aegisRef={aegisRef}
              onComplete={() => {
                setAegis({
                  expireS: 0,
                  expireTime: '',
                  expireDate: '',
                  playerId: null,
                })
              }}
            />
          )}

        {shouldBlockMap && (
          <MinimapBlocker
            key="minimap-blocker-class"
            transformRes={transformRes}
            isSimple={isSimple}
            isXL={isXL}
            minimapPosition={minimapPosition}
          />
        )}

        {shouldBlockPicks && (
          <AnimatedHeroBlocker transformRes={transformRes} block={block} />
        )}

        {['spectator', 'playing', 'arcade'].includes(block.type) && (
          <>
            {opts[Settings.commandWL] && (
              <AnimatedWLCard
                key="animate-wl-card-class"
                wlPosition={wlPosition}
                wl={wl}
              />
            )}

            {opts[Settings['mmr-tracker']] && rankImageDetails?.rank > 0 && (
              <AnimateRankBadge
                key="animate-rank-badge-class"
                badgePosition={badgePosition}
                rankImageDetails={rankImageDetails}
                transformRes={transformRes}
              />
            )}
          </>
        )}

        {[null].includes(block.type) && (
          <div
            style={{
              height: transformRes({ height: 61 }),
              width: windowSize.width,
              top: 0,
            }}
            className="absolute"
          >
            <div
              className="flex h-full items-center justify-end space-x-2"
              style={{
                marginRight: transformRes({ width: 470 }),
              }}
            >
              {opts[Settings.commandWL] && (
                <AnimatedWL
                  key="animate-wl-class"
                  wlPosition={{
                    ...wlPosition,
                    bottom: null,
                    right: null,
                    top: null,
                  }}
                  wl={wl}
                />
              )}

              {opts[Settings['mmr-tracker']] && rankImageDetails?.rank > 0 && (
                <AnimatedRank_Mainscreen
                  key="animate-rank-mainscreen-class"
                  badgePosition={{
                    ...badgePosition,
                    right: null,
                    top: null,
                  }}
                  rankImageDetails={rankImageDetails}
                  transformRes={transformRes}
                />
              )}
            </div>
          </div>
        )}

        {isDev && (
          <Image
            key="dev-image"
            width={windowSize.width}
            height={windowSize.height}
            alt={`main game`}
            src={`/images/dev/1440p-main-menu.png`}
          />
        )}
      </AnimatePresence>
    </>
  )
}
