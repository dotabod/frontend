'use client'

import io from 'socket.io-client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Head from 'next/head'
import { useRouter } from 'next/router'

let socket

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

  const [gameState, setGameState] = useState('DISCONNECTED')
  const [teamName, setTeamName] = useState('')

  const minimapStates = [
    'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
    'DOTA_GAMERULES_STATE_PRE_GAME',
  ]
  const isMinimapBlocked = minimapStates.includes(gameState)

  const pickSates = [
    'DOTA_GAMERULES_STATE_HERO_SELECTION',
    'DOTA_GAMERULES_STATE_STRATEGY_TIME',
  ]
  const isPicksBlocked = pickSates.includes(gameState)

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
    if (typeof window !== 'object' || !window?.obsstudio) return

    if (isMinimapBlocked) {
      window.obsstudio.setCurrentScene('[dotabod] blocking minimap')
    } else if (isPicksBlocked) {
      window.obsstudio.setCurrentScene('[dotabod] blocking picks')
    } else {
      window.obsstudio.setCurrentScene('[dotabod] not blocking')
    }
  }, [isMinimapBlocked, isPicksBlocked])

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
            width={244}
            height={244}
            src="/images/731-Simple-Large-AntiStreamSnipeMap.png"
          />
        </div>
      )}

      {isPicksBlocked && <PickBlocker teamName={teamName} />}
    </>
  )
}
