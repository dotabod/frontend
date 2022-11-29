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
import { getRankImage } from '@/lib/ranks'
import { Rankbadge } from '@/components/Rankbadge'
import { getWL } from '@/lib/getWL'
import { HeroBlocker } from '@/components/HeroBlocker'
import Countdown, { zeroPad } from 'react-countdown'
import { Card } from '@/components/Card'
import WinLossCard from '@/components/WinLossCard'

let socket

type dataProp = {
  steam32Id: number
  mmr: number
  settings: {
    value: any
    key: string
  }[]
  SteamAccount: {
    steam32Id: number
    mmr: number
  }[]
}

export default function OverlayPage() {
  const router = useRouter()
  const { userId } = router.query

  const [data, setData] = useState(null)
  const [paused, setPaused] = useState(false)
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

    fetcher(`/api/settings/?id=`, userId).then((data: dataProp) => {
      setData(data)

      const steam32Id = data?.SteamAccount[0]?.steam32Id || data?.steam32Id
      const mmr = data?.SteamAccount[0]?.mmr || data?.mmr
      getWL(steam32Id, setWL)
      getRankImage(mmr, steam32Id).then(setRankImageDetails)
    })
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

    socket.on('update-medal', ({ mmr, steam32Id }) => {
      // Refetch mmr and medal image
      console.log('updating medal')

      getWL(steam32Id, setWL)
      getRankImage(mmr, steam32Id).then(setRankImageDetails)
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

    if (shouldBlockMap) {
      window.obsstudio.setCurrentScene(opts[DBSettings.obsMinimap])
    } else if (shouldBlockPicks) {
      window.obsstudio.setCurrentScene(opts[DBSettings.obsPicks])
    } else {
      window.obsstudio.setCurrentScene(opts[DBSettings.obsDc])
    }
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

  const positions = [555, 615, 680, 745, 800, 1065, 1130, 1192, 1250, 1320]

  let aegisLeft = 0
  if (opts[DBSettings.bp]) {
    aegisLeft = opts[DBSettings.xl] ? 290 : 255
  } else {
    aegisLeft = opts[DBSettings.xl] ? 285 : 250
  }

  return (
    <>
      <Head>
        <title>Dotabod | Stream overlays</title>
      </Head>
      <div>
        {block?.type === 'spectator' && (
          <div
            className={`absolute ${
              opts[DBSettings.xl] ? 'bottom-[300px]' : 'bottom-[260px]'
            } left-0`}
          >
            <Card>Spectating a match</Card>
          </div>
        )}

        {(block.type === 'playing' || isDev) && roshan?.maxDate && (
          <div
            style={{ left: aegisLeft }}
            className={`absolute bottom-[100px]`}
          >
            {roshan?.minDate && (
              <div className="rounded-full bg-red-900/70">
                <CountdownCircleTimer
                  isPlaying={!paused}
                  duration={roshan?.minS}
                  colors="#A30000"
                  size={45}
                  strokeWidth={3}
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
              <CountdownCircleTimer
                isPlaying={!paused}
                duration={roshan?.maxS}
                colors="#a39800"
                size={45}
                strokeWidth={3}
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
            )}
          </div>
        )}

        {(block.type === 'playing' || isDev) && aegis.expireDate && (
          <div
            style={{
              left: positions[aegis.playerId],
            }}
            className={`absolute top-[65px] text-white/90`}
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
            className={`absolute ${
              opts[DBSettings.bp]
                ? 'bottom-[14px] left-[11px]'
                : 'bottom-0 left-0'
            }`}
            priority
            alt="minimap blocker"
            width={opts[DBSettings.xl] ? 280 : 240}
            height={opts[DBSettings.xl] ? 280 : 240}
            src={`/images/731-${
              opts[DBSettings.simple] ? 'Simple' : 'Complex'
            }-${opts[DBSettings.xl] ? 'X' : ''}Large-AntiStreamSnipeMap.png`}
          />
        )}

        {shouldBlockPicks && (
          <HeroBlocker type={block?.type} teamName={block?.team} />
        )}

        {['spectator', 'playing', 'arcade'].includes(block.type) && (
          <>
            {
              <div className="absolute bottom-0 right-[350px]">
                <WinLossCard wl={wl} />
              </div>
            }

            {opts[DBSettings.mmrTracker] && rankImageDetails?.rank > 0 && (
              <div className="absolute bottom-0 right-[276px]">
                <Rankbadge {...rankImageDetails} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

const aegisRender = ({ minutes, seconds, completed }) => {
  if (completed) {
    return null
  }
  return (
    <div className="flex flex-col items-center">
      <Image
        src="/images/aegis-icon.png"
        height={42}
        width={42}
        alt="aegis icon"
      />
      <span className="-mt-2 text-sm text-white/90">
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
        height={50}
        width={33}
        alt="roshan icon"
        className="rounded-full"
      />
      <span className="-mt-3 text-sm text-white/90">
        {minutes}:{zeroPad(seconds)}
      </span>
    </div>
  )
}
