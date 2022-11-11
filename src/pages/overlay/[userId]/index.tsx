'use client'

import io from 'socket.io-client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Head from 'next/head'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import {
  DBSettings,
  defaultSettings,
  getValueOrDefault,
} from '@/lib/DBSettings'

let socket

const minimapStates = [
  'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
  'DOTA_GAMERULES_STATE_PRE_GAME',
]

const pickSates = [
  'DOTA_GAMERULES_STATE_HERO_SELECTION',
  'DOTA_GAMERULES_STATE_STRATEGY_TIME',
]

const PickBlocker = ({ teamName }) =>
  teamName === 'radiant' ? (
    <Image
      alt="picks blocker"
      width={1920}
      height={1080}
      src="/images/block-radiant-picks.png"
    />
  ) : (
    <Image
      alt="picks blocker"
      width={1920}
      height={1080}
      src="/images/block-dire-picks.png"
    />
  )

export default function OverlayPage() {
  const router = useRouter()
  const { userId } = router.query

  const { data } = useSWR(`/api/settings/?id=${userId}`, fetcher)

  const [gameState, setGameState] = useState('DISCONNECTED')
  const [teamName, setTeamName] = useState('')

  const opts = defaultSettings
  // Replace defaults with settings from DB
  Object.values(DBSettings).forEach((key) => {
    // @ts-ignore ???
    opts[key] = getValueOrDefault(data, key)
  })

  const isMinimapBlocked =
    opts[DBSettings.mblock] && minimapStates.includes(gameState)

  const isPicksBlocked =
    opts[DBSettings.pblock] && pickSates.includes(gameState)
  console.log(opts)

  useEffect(() => {
    if (!userId) return

    socket = io(process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL, {
      auth: { token: userId },
    })

    socket.on('state', setGameState)
    socket.on('map:game_state', setGameState)
    socket.on('player:team_name', setTeamName)

    socket.on('connect_error', (err) => {
      console.log(err.message)
    })
  }, [userId])

  useEffect(() => {
    // Only run in OBS browser source
    if (
      !opts[DBSettings.obs] ||
      typeof window !== 'object' ||
      !window?.obsstudio
    )
      return

    console.log('obs studio connected')

    if (isMinimapBlocked) {
      window.obsstudio.setCurrentScene(opts[DBSettings.obsMinimap])
    } else if (isPicksBlocked) {
      window.obsstudio.setCurrentScene(opts[DBSettings.obsPicks])
    } else {
      window.obsstudio.setCurrentScene(opts[DBSettings.obsDc])
    }
  }, [isMinimapBlocked, isPicksBlocked, opts])

  useEffect(() => {
    return () => {
      socket?.off('state')
      socket?.off('map:game_state')
      socket?.off('player:team_name')
      socket?.off('connect_error')
      socket?.disconnect()
    }
  }, [])

  return (
    <>
      <Head>
        <title>Dotabod | Stream overlays</title>
      </Head>
      {isMinimapBlocked && (
        <div className="absolute bottom-0 left-0">
          <Image
            alt="minimap blocker"
            width={opts[DBSettings.xl] ? 280 : 240}
            height={opts[DBSettings.xl] ? 280 : 240}
            src={`/images/731-${
              opts[DBSettings.simple] ? 'Simple' : 'Complex'
            }-${opts[DBSettings.xl] ? 'X' : ''}Large-AntiStreamSnipeMap.png`}
          />
        </div>
      )}

      {isPicksBlocked && <PickBlocker teamName={teamName} />}
    </>
  )
}
