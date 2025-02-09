import { Settings } from '@/lib/defaultSettings'
import { type blockType, isDev } from '@/lib/devConsts'
import { fetcher } from '@/lib/fetcher'
import { createJob, getJobStatus, getMatchData } from '@/lib/hooks/openDotaAPI'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { type RankType, getRankImage } from '@/lib/ranks'
import { captureException } from '@sentry/nextjs'
import {
  EventSubChannelPollBeginEvent,
  EventSubChannelPollEndEvent,
  EventSubChannelPollProgressEvent,
  EventSubChannelPredictionBeginEvent,
  EventSubChannelPredictionEndEvent,
  EventSubChannelPredictionLockEvent,
  EventSubChannelPredictionProgressEvent,
} from '@twurple/eventsub-base'
import { App } from 'antd'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import io, { type Socket } from 'socket.io-client'
import {
  setMinimapDataBuildings,
  setMinimapDataCouriers,
  setMinimapDataCreeps,
  setMinimapDataHeroUnits,
  setMinimapDataHeroes,
  setMinimapStatus,
} from '../redux/store'

export type WinChance = {
  value: number
  time: number
  visible: boolean
}

const PING_INTERVAL_MS = 30000 // 30,000 ms = 30 seconds
const RECONNECT_DELAY_MS = 1000 // 1,000 ms = 1 second
const ERROR_RECONNECT_DELAY_MS = 2000 // 2,000 ms = 2 seconds

type wlType = {
  win: number
  lose: number
  type: string
}[]

export const useSocket = ({
  setPollData,
  setBetData,
  setBlock,
  setPaused,
  setAegis,
  setNotablePlayers,
  setRoshan,
  setConnected,
  setRankImageDetails,
  setWL,
  setRadiantWinChance,
}: {
  setPollData: (data: any) => void
  setBetData: (data: any) => void
  setBlock: (data: blockType) => void
  setPaused: (paused: boolean) => void
  setAegis: (data: any) => void
  setNotablePlayers: (data: any) => void
  setRoshan: (data: any) => void
  setConnected: (connected: boolean) => void
  setRankImageDetails: (details: any) => void
  setWL: (records: wlType) => void
  setRadiantWinChance: (
    chance: WinChance | ((prev: WinChance) => WinChance)
  ) => void
}) => {
  const router = useRouter()
  const { userId } = router.query
  const dispatch = useDispatch()
  const { notification } = App.useApp()

  // can pass any key here, we just want mutate() function on `api/settings`
  const { mutate } = useUpdateSetting(Settings.commandWL)
  const [socket, setSocketInstance] = useState<Socket | null>(null)

  // Notify user about connection status changes with exact details
  useEffect(() => {
    if (!socket?.connected) {
      notification.open({
        placement: 'bottomLeft',
        key: 'connection-status',
        type: 'warning',
        message: 'Reconnecting...',
        description: 'Lost connection to server. Attempting to reconnect...',
        duration: 0,
      })
    } else {
      notification.destroy('connection-status')
    }
  }, [socket?.connected, notification])

  // Ping mechanism: emit 'ping' every 30,000 ms and listen for 'pong'
  useEffect(() => {
    if (!socket) return
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping')
      }
    }, PING_INTERVAL_MS)

    const handlePong = () => setConnected(true)
    socket.on('pong', handlePong)
    socket.on('disconnect', () => clearInterval(pingInterval))

    return () => {
      clearInterval(pingInterval)
      socket.off('pong', handlePong)
    }
  }, [socket, setConnected])

  // Cleanup all event listeners on unmount or when socket changes
  useEffect(() => {
    return () => {
      if (socket) {
        socket.off('block')
        socket.off('paused')
        socket.off('aegis-picked-up')
        socket.off('roshan-killed')
        socket.off('connect')
        socket.off('disconnect')
        socket.off('refresh-settings')
        socket.off('notable-players')
        socket.off('channelPollOrBet')
        socket.off('update-medal')
        socket.off('update-wl')
        socket.off('update-radiant-win-chance')
        socket.off('refresh')
        socket.off('connect_error')
        socket.disconnect()
      }
    }
  }, [socket])

  // Initialize socket and register events; all timeouts and reconnects are quantified
  useEffect(() => {
    if (!userId) return

    const socketInstance: Socket = io(
      process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL,
      {
        auth: { token: userId },
      }
    )
    setSocketInstance(socketInstance)

    // Minimap data event handlers
    const handleDataBuildings = (data: any) =>
      dispatch(setMinimapDataBuildings(data))
    const handleDataHeroes = (data: any) => dispatch(setMinimapDataHeroes(data))
    const handleDataCouriers = (data: any) =>
      dispatch(setMinimapDataCouriers(data))
    const handleDataCreeps = (data: any) => dispatch(setMinimapDataCreeps(data))
    const handleDataHeroUnits = (data: any) =>
      dispatch(setMinimapDataHeroUnits(data))
    const handleStatus = (data: any) => dispatch(setMinimapStatus(data))

    socketInstance.on('DATA_buildings', handleDataBuildings)
    socketInstance.on('DATA_heroes', handleDataHeroes)
    socketInstance.on('DATA_couriers', handleDataCouriers)
    socketInstance.on('DATA_creeps', handleDataCreeps)
    socketInstance.on('DATA_hero_units', handleDataHeroUnits)
    socketInstance.on('STATUS', handleStatus)

    // requestHeroData: fetch win/lose data with exact query parameters
    socketInstance.on(
      'requestHeroData',
      async (
        { allTime, heroId, steam32Id },
        cb: (wl: { win: number; lose: number }) => void
      ) => {
        const wl = { win: 0, lose: 0 }
        const dateParam = allTime ? '' : '&date=30'
        const url = `https://api.opendota.com/api/players/${steam32Id}/wl/?hero_id=${heroId}&having=1${dateParam}`
        const response = await fetcher(url)
        if (response) {
          wl.win = response.win
          wl.lose = response.lose
        }
        cb(wl)
      }
    )

    // requestMatchData: create and monitor job with explicit logging intervals
    socketInstance.on(
      'requestMatchData',
      async ({ matchId, heroSlot }, cb: (data: any) => void) => {
        try {
          const jobId = await createJob(matchId)
          await getJobStatus(jobId)
          const data = await getMatchData(matchId, heroSlot)
          cb(data)
        } catch (error) {
          captureException(error)
          cb(null)
        }
      }
    )

    // Block event: add a 5,000 ms delay if type is 'playing'
    socketInstance.on('block', (data: blockType) => {
      if (data?.type === 'playing') {
        setTimeout(() => {
          setBlock(data)
        }, 5000)
      } else {
        setBlock(data)
      }
    })

    socketInstance.on('paused', setPaused)
    socketInstance.on('notable-players', setNotablePlayers)
    socketInstance.on('aegis-picked-up', setAegis)
    socketInstance.on('roshan-killed', setRoshan)

    // Authentication error: log and close connection
    socketInstance.on('auth_error', (message: string) => {
      console.error('Authentication failed:', message)
      socketInstance.close()
    })

    socketInstance.on('connect', () => setConnected(true))
    socketInstance.on('disconnect', (reason: string) => {
      setConnected(false)
      if (
        ['io server disconnect', 'transport close', 'ping timeout'].includes(
          reason
        )
      ) {
        setTimeout(() => socketInstance.connect(), RECONNECT_DELAY_MS)
      }
    })

    socketInstance.on('refresh-settings', (key: typeof Settings) => {
      mutate()
    })

    // Handle channelPollOrBet events based on event name with precise logic
    socketInstance.on('channelPollOrBet', (data: any, eventName: string) => {
      const handler = eventName.includes('Poll') ? setPollData : setBetData
      const newData =
        eventName.includes('End') || eventName.includes('Lock') ? null : data
      handler(newData)
    })

    // Update medal only in non-dev mode with explicit rank image mapping
    socketInstance.on('update-medal', (deets: RankType) => {
      if (!isDev) {
        setRankImageDetails(getRankImage(deets))
      }
    })

    // Update win/loss records only in non-dev mode
    socketInstance.on('update-wl', (records: wlType) => {
      if (!isDev) {
        setWL(records)
      }
    })

    // Update Radiant win chance with quantified state visibility changes
    socketInstance.on(
      'update-radiant-win-chance',
      (chanceDetails: WinChance) => {
        if (!isDev) {
          if (!chanceDetails) {
            setRadiantWinChance((prev) => ({ ...prev, visible: false }))
          } else {
            setRadiantWinChance({ ...chanceDetails, visible: true })
          }
        }
      }
    )

    // Reload page on refresh event
    socketInstance.on('refresh', () => {
      router.reload()
    })

    // On error: log exception and attempt reconnect after 2,000 ms if not connected
    socketInstance.on('error', (error: any) => {
      captureException(error)
      setTimeout(() => {
        if (!socketInstance.connected) {
          socketInstance.connect()
        }
      }, ERROR_RECONNECT_DELAY_MS)
    })

    // On connect error: mark as disconnected and reconnect after 1,000 ms
    socketInstance.on('connect_error', (error: any) => {
      setConnected(false)
      setTimeout(() => {
        socketInstance.connect()
      }, RECONNECT_DELAY_MS)
    })

    // Cleanup: Remove registered handlers and disconnect socket
    return () => {
      socketInstance.off('DATA_buildings', handleDataBuildings)
      socketInstance.off('DATA_heroes', handleDataHeroes)
      socketInstance.off('DATA_couriers', handleDataCouriers)
      socketInstance.off('DATA_creeps', handleDataCreeps)
      socketInstance.off('DATA_hero_units', handleDataHeroUnits)
      socketInstance.off('STATUS', handleStatus)
      socketInstance.disconnect()
      setSocketInstance(null)
    }
  }, [
    userId,
    dispatch,
    mutate,
    router,
    setBlock,
    setPaused,
    setAegis,
    setNotablePlayers,
    setRoshan,
    setConnected,
    setRankImageDetails,
    setWL,
    setRadiantWinChance,
    notification,
  ])

  return socket
}

// Export events with explicit mappings for subscribing to prediction and poll events.
const events = {
  subscribeToChannelPredictionBeginEvents: EventSubChannelPredictionBeginEvent,
  subscribeToChannelPredictionProgressEvents:
    EventSubChannelPredictionProgressEvent,
  subscribeToChannelPredictionLockEvents: EventSubChannelPredictionLockEvent,
  subscribeToChannelPredictionEndEvents: EventSubChannelPredictionEndEvent,
  subscribeToChannelPollBeginEvents: EventSubChannelPollBeginEvent,
  subscribeToChannelPollProgressEvents: EventSubChannelPollProgressEvent,
  subscribeToChannelPollEndEvents: EventSubChannelPollEndEvent,
}

export type Events = keyof typeof events
