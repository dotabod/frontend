'use client'

import io from 'socket.io-client'
import { useEffect, useState } from 'react'
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
import { Card } from '@/components/Card'

let socket

const HeroBlocker = ({ teamName, type }) => {
  if (!type) return null

  return (
    <Image
      priority
      alt={`${type} blocker`}
      width={1920}
      height={1080}
      src={`/images/block-${teamName}-${type}.png`}
    />
  )
}

const getWL = (steam32Id, cb) => {
  const promises = [
    fetcher(
      `https://api.opendota.com/api/players/${steam32Id}/wl/?date=0.5&lobby_type=0`
    ),
    fetcher(
      `https://api.opendota.com/api/players/${steam32Id}/wl/?date=0.5&lobby_type=7`
    ),
  ]

  Promise.all(promises)
    .then((values: { win: number; lose: number }[]) => {
      const [unranked, ranked] = values
      const { win, lose } = ranked
      const { win: unrankedWin, lose: unrankedLose } = unranked
      const hasUnranked = unrankedWin + unrankedLose !== 0
      const hasRanked = win + lose !== 0

      const record = []
      if (hasRanked) record.push({ win: win, lose: lose, type: 'R' })
      if (hasUnranked)
        record.push({ win: unrankedWin, lose: unrankedLose, type: 'U' })
      if (!hasRanked && !hasUnranked)
        record.push({ win: 0, lose: 0, type: 'U' })
      cb(record)
    })
    .catch((e) => {
      console.log(e)
    })
}

export default function OverlayPage() {
  const router = useRouter()
  const { userId } = router.query

  const [data, setData] = useState(null)
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

  useEffect(() => {
    if (!userId) return

    fetcher(`/api/settings/?id=`, userId).then((data) => {
      setData(data)
      getWL(data?.steam32Id, setWL)
      getRankImage(data?.mmr, data?.steam32Id).then(setRankImageDetails)
    })
  }, [userId])

  const [block, setBlock] = useState({ type: null, team: null })
  const [connected, setConnected] = useState(false)

  const opts = defaultSettings
  // Replace defaults with settings from DB
  Object.values(DBSettings).forEach((key) => {
    // @ts-ignore ???
    opts[key] = getValueOrDefault(data?.settings, key)
  })

  const isMinimapBlocked = opts[DBSettings.mblock] && block.type === 'playing'
  const isPicksBlocked = opts[DBSettings.pblock] && block.type === 'picks'

  useEffect(() => {
    if (!userId) return

    console.log('Connecting to socket init...')

    socket = io(process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL, {
      auth: { token: userId },
    })

    socket.on('block', setBlock)
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

    // Debug info
    if (isMinimapBlocked) {
      console.log({ setCurrentScene: opts[DBSettings.obsMinimap] })
    } else if (isPicksBlocked) {
      console.log({ setCurrentScene: opts[DBSettings.obsPicks] })
    } else {
      console.log({ setCurrentScene: opts[DBSettings.obsDc] })
    }

    // Only run in OBS browser source
    if (
      !opts[DBSettings.obs] ||
      typeof window !== 'object' ||
      !window?.obsstudio
    )
      return

    console.log('OBS studio is connected')

    if (isMinimapBlocked) {
      window.obsstudio.setCurrentScene(opts[DBSettings.obsMinimap])
    } else if (isPicksBlocked) {
      window.obsstudio.setCurrentScene(opts[DBSettings.obsPicks])
    } else {
      window.obsstudio.setCurrentScene(opts[DBSettings.obsDc])
    }
  }, [connected, userId, isMinimapBlocked, isPicksBlocked, opts])

  useEffect(() => {
    return () => {
      socket?.off('block')
      socket?.off('update-medal')
      socket?.off('connect')
      socket?.off('connect_error')
      socket?.disconnect()
    }
  }, [])

  return (
    <>
      <Head>
        <title>Dotabod | Stream overlays</title>
      </Head>
      <div>
        {false && process.env.NODE_ENV === 'development' && (
          <Image
            height={1080}
            width={1920}
            alt={`main game`}
            src={`/images/shot_0012.png`}
          />
        )}

        {isMinimapBlocked && (
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

        {isPicksBlocked && (
          <HeroBlocker type={block?.type} teamName={block?.team} />
        )}

        {(block.type === 'spectator' || block.type === 'playing') && (
          <>
            <div className="absolute bottom-0 right-[350px]">
              <Card>
                {wl.map(({ win, lose, type }) => (
                  <div
                    key={type}
                    className="flex w-full flex-row items-baseline justify-end space-x-1"
                  >
                    <span>
                      {win || 0} <span className="text-green-300">W</span> -{' '}
                      {lose || 0} <span className="text-red-300">L</span>
                    </span>
                    {wl.length > 1 && <span className="text-xs ">{type}</span>}
                  </div>
                ))}
              </Card>
            </div>

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
