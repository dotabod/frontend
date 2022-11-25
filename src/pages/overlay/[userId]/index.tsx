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
import { getWL } from '@/lib/getWL'
import { HeroBlocker } from '@/components/HeroBlocker'
import { WinLossCard } from '@/components/WinLossCard'

let socket

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

  const shouldBlockMap = opts[DBSettings.mblock] && block.type === 'playing'
  const shouldBlockPicks =
    opts[DBSettings.pblock] && ['picks', 'strategy'].includes(block.type)

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
    if (shouldBlockMap) {
      console.log({ setCurrentScene: opts[DBSettings.obsMinimap] })
    } else if (shouldBlockPicks) {
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

        {block?.type === 'spectator' && (
          <div className={`absolute bottom-[260px] left-[49px] text-white/90`}>
            Spectating a match
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
            {WinLossCard(wl)}

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
