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

// Add heartbeat/ping mechanism
const PING_INTERVAL = 30000 // 30 seconds

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
}) => {
  const router = useRouter()
  const { userId } = router.query
  const dispatch = useDispatch()
  const { notification } = App.useApp()

  // can pass any key here, we just want mutate() function on `api/settings`
  const { mutate } = useUpdateSetting(Settings.commandWL)

  // Convert the external socket to component state
  const [socket, setSocketInstance] = useState<Socket | null>(null)

  // Update the connection status effect
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

  useEffect(() => {
    if (!socket) return

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping')
      }
    }, PING_INTERVAL)

    socket.on('pong', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      // Clear interval on disconnect to prevent pings during reconnection attempts
      clearInterval(pingInterval)
    })

    return () => {
      clearInterval(pingInterval)
    }
  }, [setConnected])

  // on react unmount. mainly used for hot reloads so it doesnt register 900 .on()'s
  useEffect(() => {
    return () => {
      socket?.off('block')
      socket?.off('paused')
      socket?.off('aegis-picked-up')
      socket?.off('roshan-killed')
      socket?.off('connect')
      socket?.off('disconnect')
      socket?.off('refresh-settings')
      socket?.off('notable-players')
      socket?.off('channelPollOrBet')
      socket?.off('update-medal')
      socket?.off('update-wl')
      socket?.off('update-radiant-win-chance')
      socket?.off('refresh')
      socket?.off('connect_error')
      socket?.disconnect()
    }
  }, [])

  // Update socket initialization
  useEffect(() => {
    if (!userId) return

    console.log('Connecting to socket init...')

    const socket = io(process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL, {
      auth: { token: userId },
    })

    setSocketInstance(socket)

    socket.on('DATA_buildings', (data: any) => {
      dispatch(setMinimapDataBuildings(data))
    })

    socket.on('DATA_heroes', (data: any) => {
      dispatch(setMinimapDataHeroes(data))
    })

    socket.on('DATA_couriers', (data: any) => {
      dispatch(setMinimapDataCouriers(data))
    })

    socket.on('DATA_creeps', (data: any) => {
      dispatch(setMinimapDataCreeps(data))
    })
    socket.on('DATA_hero_units', (data: any) => {
      dispatch(setMinimapDataHeroUnits(data))
    })
    socket.on('STATUS', (data: any) => {
      dispatch(setMinimapStatus(data))
    })

    socket.on('requestHeroData', async ({ allTime, heroId, steam32Id }, cb) => {
      const wl = { win: 0, lose: 0 }
      const response = await fetcher(
        `https://api.opendota.com/api/players/${steam32Id}/wl/?hero_id=${heroId}&having=1${
          allTime ? '' : '&date=30'
        }`
      )

      if (response) {
        wl.win = response.win
        wl.lose = response.lose
      }

      cb(wl)
    })

    socket.on('requestMatchData', async ({ matchId, heroSlot }, cb) => {
      console.log('[MMR] requestMatchData event received', {
        matchId,
        heroSlot,
      })
      try {
        // Create a job to parse the match
        console.log('[MMR] Creating job for matchId:', matchId)
        const jobId = await createJob(matchId)
        console.log('[MMR] Job created with jobId:', jobId)

        // Wait for the job to finish
        console.log('[MMR] Waiting for job to finish for jobId:', jobId)
        await getJobStatus(jobId)
        console.log('[MMR] Job finished for jobId:', jobId)

        // Get match data once parsing is complete
        console.log(
          '[MMR] Fetching match data for matchId:',
          matchId,
          'and heroSlot:',
          heroSlot
        )
        const data = await getMatchData(matchId, heroSlot)
        console.log('[MMR] Match data fetched:', data)
        cb(data)
      } catch (e) {
        captureException(e)
        console.log('[MMR] Error fetching match data', { e })
        cb(null)
      }
    })

    socket.on('block', (data: blockType) => {
      if (data?.type === 'playing') {
        setTimeout(() => {
          setBlock(data)
        }, 5000)
      } else {
        setBlock(data)
      }
    })
    socket.on('paused', setPaused)
    socket.on('notable-players', setNotablePlayers)
    socket.on('aegis-picked-up', setAegis)
    socket.on('roshan-killed', setRoshan)
    socket.on('auth_error', (message) => {
      console.error('Authentication failed:', message)
      socket.close()
    })
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', (reason) => {
      setConnected(false)
      console.log('Disconnected from socket', { reason })

      // Add more comprehensive reconnection logic
      if (
        reason === 'io server disconnect' ||
        reason === 'transport close' ||
        reason === 'ping timeout'
      ) {
        console.log('Attempting to reconnect...')
        setTimeout(() => socket.connect(), 1000)
      }
    })

    socket.on('refresh-settings', (key: typeof Settings) => {
      mutate()
    })

    socket.on('channelPollOrBet', (data: any, eventName: string) => {
      console.log('twitchEvent', { eventName, data })
      const func = eventName.includes('Poll') ? setPollData : setBetData
      const newData =
        eventName.includes('End') || eventName.includes('Lock') ? null : data
      func(newData)
    })

    socket.on('update-medal', (deets: RankType) => {
      if (isDev) return
      setRankImageDetails(getRankImage(deets))
    })

    socket.on('update-wl', (records: wlType) => {
      if (isDev) return
      setWL(records)
    })

    socket.on('update-radiant-win-chance', (chanceDetails: WinChance) => {
      if (isDev) return
      // TODO: set setRadiantWinChance(null) on new match to avoid animation between matches
      if (!chanceDetails) {
        return setRadiantWinChance((prev) => ({ ...prev, visible: false }))
      }
      setRadiantWinChance({ ...chanceDetails, visible: true })
    })

    socket.on('refresh', () => {
      router.reload()
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
      captureException(error)

      // Attempt to reconnect on error
      setTimeout(() => {
        if (!socket.connected) {
          console.log('Attempting to reconnect after error...')
          socket.connect()
        }
      }, 2000)
    })

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setConnected(false)

      // More aggressive reconnection on connection errors
      setTimeout(() => {
        console.log('Attempting to reconnect after connection error...')
        socket.connect()
      }, 1000)
    })

    return () => {
      socket?.disconnect()
      setSocketInstance(null)
    }
  }, [userId])
}

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
