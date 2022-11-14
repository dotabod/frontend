'use client'

import io from 'socket.io-client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Head from 'next/head'
import { useRouter } from 'next/router'
import useSWR, { useSWRConfig } from 'swr'
import { fetcher } from '@/lib/fetcher'
import {
  DBSettings,
  defaultSettings,
  getValueOrDefault,
} from '@/lib/DBSettings'
import { getRankImage } from '@/lib/ranks'

let socket

const PickBlocker = ({ teamName }) =>
  teamName === 'radiant' ? (
    <Image
      priority
      alt="picks blocker"
      width={1920}
      height={1080}
      src="/images/block-radiant-picks.png"
    />
  ) : (
    <Image
      priority
      alt="picks blocker"
      width={1920}
      height={1080}
      src="/images/block-dire-picks.png"
    />
  )

export default function OverlayPage() {
  const router = useRouter()
  const { userId } = router.query

  const swrKey = `/api/settings/?id=${userId}`
  const { data } = useSWR(swrKey, userId && fetcher)
  const { mutate } = useSWRConfig()

  const [rankImageDetails, setRankImageDetails] = useState({
    image: '0.png',
    rank: 0,
    leaderboard: false,
  })

  useEffect(() => {
    getRankImage(data?.mmr, data?.playerId).then(setRankImageDetails)
  }, [data?.mmr, data?.playerId])

  const [block, setBlock] = useState({ type: null, team: null })
  const [connected, setConnected] = useState(false)

  const opts = defaultSettings
  // Replace defaults with settings from DB
  Object.values(DBSettings).forEach((key) => {
    // @ts-ignore ???
    opts[key] = getValueOrDefault(data?.settings, key)
  })

  const isMinimapBlocked = opts[DBSettings.mblock] && block.type === 'minimap'
  const isPicksBlocked =
    opts[DBSettings.pblock] && block?.type === 'picks' && block?.team

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

    socket.on('update-medal', () => {
      // Refetch mmr and medal image
      console.log('updating medal')

      mutate(swrKey)
    })

    socket.on('connect_error', console.log)
  }, [userId])

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
      <div className="hidden">
        <div className="absolute bottom-0 left-[100px]">
          <span className="text-yellow-500">WL 0 1</span>
        </div>
      </div>
      {isMinimapBlocked && (
        <div>
          <div className="absolute bottom-0 left-0">
            <Image
              priority
              alt="minimap blocker"
              width={opts[DBSettings.xl] ? 280 : 240}
              height={opts[DBSettings.xl] ? 280 : 240}
              src={`/images/731-${
                opts[DBSettings.simple] ? 'Simple' : 'Complex'
              }-${opts[DBSettings.xl] ? 'X' : ''}Large-AntiStreamSnipeMap.png`}
            />
          </div>
          {rankImageDetails?.rank > 0 && (
            <div className="absolute bottom-0 right-[276px]">
              <div className="flex flex-col items-center rounded-md bg-slate-500/50 p-1 shadow-md">
                <Image
                  priority
                  alt="minimap blocker"
                  width={56}
                  height={56}
                  src={`/images/ranks/${rankImageDetails.image}`}
                />
                <span className="text-xs text-yellow-500">
                  {rankImageDetails?.leaderboard && '#'}
                  {rankImageDetails.rank}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {isPicksBlocked && <PickBlocker teamName={block?.team} />}
    </>
  )
}
