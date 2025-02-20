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
import { useRouter } from 'next/router'
import { useEffect } from 'react'
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

export let socket: Socket | null = null

export type WinChance = {
  value: number
  time: number
  visible: boolean
}

export type wlType = {
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

  // can pass any key here, we just want mutate() function on `api/settings`
  const { mutate } = useUpdateSetting(Settings.commandWL)

  useEffect(() => {
    if (!userId) return

    // Add ping interval and last received time tracking
    let lastReceivedTime = Date.now()
    let pingInterval: NodeJS.Timeout
    let reconnectTimeout: NodeJS.Timeout

    console.log('Connecting to socket init...')

    socket = io(process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL, {
      auth: { token: userId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    // Setup ping/pong to detect stale connections
    const setupHeartbeat = () => {
      pingInterval = setInterval(() => {
        // If we haven't received any data for 30 seconds, reconnect
        if (Date.now() - lastReceivedTime > 30000) {
          console.log('No data received for 30s, reconnecting...')
          socket?.disconnect()
          socket?.connect()
        }

        // Send ping
        socket?.emit('ping')
      }, 15000)
    }

    // Update lastReceivedTime whenever we get any data
    const updateLastReceived = () => {
      lastReceivedTime = Date.now()
    }

    socket.on('pong', () => {
      updateLastReceived()
    })

    // Add handlers for all existing events
    socket.on('DATA_buildings', (data) => {
      updateLastReceived()
      dispatch(setMinimapDataBuildings(data))
    })

    socket.on('DATA_heroes', (data) => {
      updateLastReceived()
      dispatch(setMinimapDataHeroes(data))
    })

    socket.on('DATA_couriers', (data: any) => {
      updateLastReceived()
      dispatch(setMinimapDataCouriers(data))
    })

    socket.on('DATA_creeps', (data: any) => {
      updateLastReceived()
      dispatch(setMinimapDataCreeps(data))
    })
    socket.on('DATA_hero_units', (data: any) => {
      updateLastReceived()
      dispatch(setMinimapDataHeroUnits(data))
    })
    socket.on('STATUS', (data: any) => {
      updateLastReceived()
      dispatch(setMinimapStatus(data))
    })

    socket.on('requestHeroData', async ({ allTime, heroId, steam32Id }, cb) => {
      updateLastReceived()
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
      updateLastReceived()
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
      updateLastReceived()
      if (data?.type === 'playing') {
        setTimeout(() => {
          setBlock(data)
        }, 5000)
      } else {
        setBlock(data)
      }
    })
    socket.on('paused', () => {
      updateLastReceived()
      setPaused()
    })
    socket.on('notable-players', () => {
      updateLastReceived()
      setNotablePlayers()
    })
    socket.on('aegis-picked-up', () => {
      updateLastReceived()
      setAegis()
    })
    socket.on('roshan-killed', () => {
      updateLastReceived()
      setRoshan()
    })
    socket.on('auth_error', (message) => {
      console.error('Authentication failed:', message)
      socket.close()
    })
    socket.on('connect', () => {
      console.log('Socket connected')
      setConnected(true)
      setupHeartbeat()
    })
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setConnected(false)
    })
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setConnected(false)
      clearInterval(pingInterval)

      // If server initiated disconnect, try to reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        reconnectTimeout = setTimeout(() => {
          console.log('Attempting to reconnect...')
          socket?.connect()
        }, 1000)
      }
    })

    socket.on('refresh-settings', (key: typeof Settings) => {
      updateLastReceived()
      mutate()
    })

    socket.on('channelPollOrBet', (data: any, eventName: string) => {
      updateLastReceived()
      console.log('twitchEvent', { eventName, data })
      const func = eventName.includes('Poll') ? setPollData : setBetData
      const newData =
        eventName.includes('End') || eventName.includes('Lock') ? null : data
      func(newData)
    })

    socket.on('update-medal', (deets: RankType) => {
      updateLastReceived()
      if (isDev) return
      setRankImageDetails(getRankImage(deets))
    })

    socket.on('update-wl', (records: wlType) => {
      updateLastReceived()
      if (isDev) return
      setWL(records)
    })

    socket.on('update-radiant-win-chance', (chanceDetails: WinChance) => {
      updateLastReceived()
      if (isDev) return
      // TODO: set setRadiantWinChance(null) on new match to avoid animation between matches
      if (!chanceDetails) {
        return setRadiantWinChance((prev) => ({ ...prev, visible: false }))
      }
      setRadiantWinChance({ ...chanceDetails, visible: true })
    })

    socket.on('refresh', () => {
      updateLastReceived()
      router.reload()
    })

    // Clean up
    return () => {
      clearInterval(pingInterval)
      clearTimeout(reconnectTimeout)
      socket?.disconnect()
      socket = null
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
