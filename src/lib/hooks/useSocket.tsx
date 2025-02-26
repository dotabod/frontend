import { Settings } from '@/lib/defaultSettings'
import { type blockType, isDev } from '@/lib/devConsts'
import { fetcher } from '@/lib/fetcher'
import { getMatchData, matchDataCache } from '@/lib/hooks/openDotaAPI'
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

// Add these type definitions
type CourierData = {
  // Define courier data structure based on your application
  id: number
  position: [number, number]
  team: number
  // Add other properties as needed
}

type CreepData = {
  // Define creep data structure based on your application
  id: number
  position: [number, number]
  team: number
  // Add other properties as needed
}

type HeroUnitData = {
  // Define hero unit data structure based on your application
  id: number
  position: [number, number]
  team: number
  // Add other properties as needed
}

type MinimapStatusData = {
  // Define status data structure based on your application
  gameState: string
  matchId?: string
  // Add other properties as needed
}

type TwitchEventData = {
  // Define the structure of your Twitch event data
  id: string
  title?: string
  outcomes?: Array<{
    id: string
    title: string
    color: string
    users?: number
    points?: number
    // Add other properties as needed
  }>
  status?: string
  // Add other properties as needed
}

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

    // Use socket.io's built-in ping event to track connection health
    socket.io.on('ping', () => {
      lastReceivedTime = Date.now()
    })

    // Monitor for stale connections
    const connectionMonitor = setInterval(() => {
      if (Date.now() - lastReceivedTime > 45000) {
        // 45s = 3 missed pings
        console.log('Connection appears stale, reconnecting...')
        socket?.disconnect()
        socket?.connect()
      }
    }, 15000)

    // Update lastReceivedTime whenever we get any data
    const updateLastReceived = () => {
      lastReceivedTime = Date.now()
    }

    // Add handlers for all existing events
    socket.on('DATA_buildings', (data) => {
      updateLastReceived()
      dispatch(setMinimapDataBuildings(data))
    })

    socket.on('DATA_heroes', (data) => {
      updateLastReceived()
      dispatch(setMinimapDataHeroes(data))
    })

    socket.on('DATA_couriers', (data: CourierData[]) => {
      updateLastReceived()
      dispatch(setMinimapDataCouriers(data))
    })

    socket.on('DATA_creeps', (data: CreepData[]) => {
      updateLastReceived()
      dispatch(setMinimapDataCreeps(data))
    })
    socket.on('DATA_hero_units', (data: HeroUnitData[]) => {
      updateLastReceived()
      dispatch(setMinimapDataHeroUnits(data))
    })
    socket.on('STATUS', (data: MinimapStatusData) => {
      updateLastReceived()
      dispatch(setMinimapStatus(data))
    })

    socket.on('requestHeroData', async ({ allTime, heroId, steam32Id }, cb) => {
      updateLastReceived()
      const wl = { win: 0, lose: 0 }
      const response = await fetcher(
        `https://api.opendota.com/api/players/${steam32Id}/wl/?hero_id=${heroId}&having=1${
          allTime ? '' : '&date=30'
        }`,
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
        // First check if we already have the match data cached
        if (matchDataCache.has(matchId)) {
          console.log('[MMR] Using cached match data for matchId:', matchId)
          cb(matchDataCache.get(matchId))
          return
        }

        // Try to get match data directly - the enhanced getMatchData will handle parsing if needed
        console.log('[MMR] Fetching match data for matchId:', matchId, 'and heroSlot:', heroSlot)
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
    socket.on('paused', (data) => {
      updateLastReceived()
      setPaused(data)
    })
    socket.on('notable-players', (data) => {
      updateLastReceived()
      setNotablePlayers(data)
    })
    socket.on('aegis-picked-up', (data) => {
      updateLastReceived()
      setAegis(data)
    })
    socket.on('roshan-killed', (data) => {
      updateLastReceived()
      setRoshan(data)
    })
    socket.on('auth_error', (message) => {
      console.error('Authentication failed:', message)
      socket.close()
    })
    socket.on('connect', () => {
      console.log('Socket connected')
      setConnected(true)
    })
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setConnected(false)
    })
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setConnected(false)
    })

    socket.on('refresh-settings', (key: typeof Settings) => {
      updateLastReceived()
      mutate()
    })

    socket.on('channelPollOrBet', (data: TwitchEventData, eventName: string) => {
      updateLastReceived()
      console.log('twitchEvent', { eventName, data })
      const func = eventName.includes('Poll') ? setPollData : setBetData
      const newData = eventName.includes('End') || eventName.includes('Lock') ? null : data
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
      clearInterval(connectionMonitor)
      clearTimeout(reconnectTimeout)
      socket?.disconnect()
      socket = null
    }
  }, [userId])
}

const events = {
  subscribeToChannelPredictionBeginEvents: EventSubChannelPredictionBeginEvent,
  subscribeToChannelPredictionProgressEvents: EventSubChannelPredictionProgressEvent,
  subscribeToChannelPredictionLockEvents: EventSubChannelPredictionLockEvent,
  subscribeToChannelPredictionEndEvents: EventSubChannelPredictionEndEvent,
  subscribeToChannelPollBeginEvents: EventSubChannelPollBeginEvent,
  subscribeToChannelPollProgressEvents: EventSubChannelPollProgressEvent,
  subscribeToChannelPollEndEvents: EventSubChannelPollEndEvent,
}

export type Events = keyof typeof events
