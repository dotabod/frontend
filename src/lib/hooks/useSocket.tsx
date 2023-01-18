import { useEffect } from 'react'
import io, { Socket } from 'socket.io-client'
import { getRankImage, RankType } from '@/lib/ranks'
import { useRouter } from 'next/router'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'

export let socket: Socket | null = null

interface UseSocketParams {
  setBlock: (
    value:
      | ((prevState: { team: null; type: null; matchId: null }) => {
          team: null
          type: null
          matchId: null
        })
      | { team: null; type: null; matchId: null }
  ) => void
  setPaused: (value: ((prevState: boolean) => boolean) | boolean) => void
  setAegis: (
    value:
      | ((prevState: {
          expireS: number
          expireTime: string
          expireDate: string
          playerId: number
        }) => {
          expireS: number
          expireTime: string
          expireDate: string
          playerId: number
        })
      | {
          expireS: number
          expireTime: string
          expireDate: string
          playerId: number
        }
  ) => void
  setRoshan: (
    value:
      | ((prevState: {
          minS: number
          minDate: string
          count: number
          maxDate: string
          maxS: number
        }) => {
          minS: number
          minDate: string
          count: number
          maxDate: string
          maxS: number
        })
      | {
          minS: number
          minDate: string
          count: number
          maxDate: string
          maxS: number
        }
  ) => void
  setConnected: (value: ((prevState: boolean) => boolean) | boolean) => void
  setRankImageDetails: (
    value:
      | ((prevState: { image: string; leaderboard: boolean; rank: number }) => {
          image: string
          leaderboard: boolean
          rank: number
        })
      | { image: string; leaderboard: boolean; rank: number }
  ) => void
  wl: { lose: number; type: string; win: number }[]
  setWL: (
    value:
      | ((
          prevState: { lose: number; type: string; win: number }[]
        ) => { lose: number; type: string; win: number }[])
      | { lose: number; type: string; win: number }[]
  ) => void
}

export const useSocket = ({
  setBlock,
  setPaused,
  setAegis,
  setRoshan,
  setConnected,
  setRankImageDetails,
  wl,
  setWL,
}: UseSocketParams) => {
  const router = useRouter()
  const { userId } = router.query

  // can pass any key here, we just want mutate() function on `api/settings`
  const { mutate } = useUpdateSetting(Settings.commandWL)

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
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', (reason) => {
      setConnected(false)

      if (reason === 'io server disconnect') {
        console.log('Reconnecting...')
        // the disconnection was initiated by the server, need to reconnect manually
        socket.connect()
      }
    })

    socket.on('refresh-settings', (key: typeof Settings) => {
      mutate()
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
  }, [
    mutate,
    router,
    setAegis,
    setBlock,
    setConnected,
    setPaused,
    setRankImageDetails,
    setRoshan,
    setWL,
    userId,
  ])
}
