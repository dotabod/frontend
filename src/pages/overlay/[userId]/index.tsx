import { AnimatePresence, motion } from 'framer-motion'
import { HeroBlocker } from '@/components/Overlay/blocker/HeroBlocker'
import { Rankbadge } from '@/components/Overlay/rank/Rankbadge'
import WinLossCard from '@/components/Overlay/WinLossCard'
import {
  DBSettings,
  defaultSettings,
  getValueOrDefault,
} from '@/lib/DBSettings'
import { fetcher } from '@/lib/fetcher'
import { getRankImage, RankDeets } from '@/lib/ranks'
import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import Countdown from 'react-countdown'
import io from 'socket.io-client'
import { SpectatorText } from '@/components/Overlay/SpectatorText'
import { AegisTimer } from '@/components/Overlay/aegis/AegisTimer'
import { MinimapBlocker } from '@/components/Overlay/blocker/MinimapBlocker'
import { AnimateRosh } from '@/components/Overlay/rosh/AnimateRosh'
import { AnimateRankBadge } from '@/components/Overlay/rank/AnimateRankBadge'

let socket

// add ordinal string to count variable
export const ordinal = (count) => {
  const j = count % 10
  const k = count % 100
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

export const transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
}

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

  const [block, setBlock] = useState({ type: null, team: null, matchId: null })
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

    window.obsstudio.getCurrentScene(function (scene) {
      const myScenes = [
        opts[DBSettings['obs-minimap']],
        opts[DBSettings['obs-picks']],
        opts[DBSettings['obs-dc']],
      ]

      setScene(scene)

      // Some people don't enable the permissions
      if (typeof window.obsstudio.setCurrentScene !== 'function') return

      if (block.type === 'playing') {
        window.obsstudio.setCurrentScene(opts[DBSettings['obs-minimap']])
        return
      }
      if (['picks', 'strategy'].includes(block.type)) {
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
      <AnimatePresence>
        {block?.type === 'spectator' && (
          <SpectatorText
            block={block}
            transformRes={transformRes}
            isXL={isXL}
          />
        )}

        {opts[DBSettings.rosh] &&
          (block.type === 'playing' || isDev) &&
          roshan?.maxDate && (
            <AnimateRosh
              style={roshPosition}
              roshan={roshan}
              paused={paused}
              onComplete={() => {
                if (roshan?.minDate) {
                  setRoshan({ ...roshan, minDate: '', minS: 0 })
                } else {
                  setRoshan({
                    ...roshan,
                    minS: 0,
                    minDate: '',
                    maxDate: '',
                    maxS: 0,
                  })
                }
              }}
              transformRes={transformRes}
              countdownRef={countdownRef}
            />
          )}

        {opts[DBSettings.aegis] &&
          (block.type === 'playing' || isDev) &&
          aegis.expireDate && (
            <motion.div
              initial={{
                scale: 2,
              }}
              transition={transition}
              animate={{
                scale: 1,
              }}
              exit={{ scale: 0 }}
              style={{
                left: leftPositions[aegis.playerId],
                top: transformRes({ height: 65 }),
              }}
              className={`absolute text-white/90`}
            >
              <Countdown
                date={aegis.expireDate}
                renderer={AegisTimer(transformRes)}
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
            </motion.div>
          )}

        {shouldBlockMap && (
          <MinimapBlocker
            transformRes={transformRes}
            isSimple={isSimple}
            isXL={isXL}
            minimapPosition={minimapPosition}
          />
        )}

        {shouldBlockPicks && (
          <motion.div
            initial={{
              scale: 2,
            }}
            transition={transition}
            animate={{
              scale: 1,
            }}
            exit={{ scale: 0 }}
          >
            <HeroBlocker
              transformRes={transformRes}
              type={block?.type}
              teamName={block?.team}
            />
          </motion.div>
        )}

        {['spectator', 'playing', 'arcade'].includes(block.type) && (
          <>
            {opts[DBSettings.commandWL] && (
              <motion.div
                initial={{
                  right: wlPosition.right * -1,
                }}
                transition={transition}
                animate={{
                  right: wlPosition.right,
                }}
                exit={{ right: wlPosition.right * -1 }}
                className="absolute"
                style={wlPosition}
              >
                <WinLossCard wl={wl} />
              </motion.div>
            )}

            {opts[DBSettings['mmr-tracker']] && rankImageDetails?.rank > 0 && (
              <AnimateRankBadge
                badgePosition={badgePosition}
                rankImageDetails={rankImageDetails}
                transformRes={transformRes}
              />
            )}
          </>
        )}

        {[null].includes(block.type) && (
          <>
            {opts[DBSettings.commandWL] && (
              <motion.div
                initial={{
                  scale: 0,
                  right: 0,
                }}
                transition={transition}
                animate={{
                  scale: 1,
                  right: transformRes({ width: 600 }),
                }}
                exit={{ scale: 0, right: 0 }}
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
              </motion.div>
            )}

            {opts[DBSettings['mmr-tracker']] && rankImageDetails?.rank > 0 && (
              <motion.div
                initial={{
                  scale: 0,
                  right: 0,
                }}
                transition={transition}
                animate={{
                  scale: 1,
                  right: transformRes({ width: 480 }),
                }}
                exit={{ scale: 0, right: 0 }}
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
              </motion.div>
            )}
          </>
        )}

        {isDev && (
          <Image
            width={transformRes({ width: 1920 })}
            height={transformRes({ height: 1080 })}
            alt={`main game`}
            src={`/images/dev/shot_0012.png`}
          />
        )}
      </AnimatePresence>
    </>
  )
}
