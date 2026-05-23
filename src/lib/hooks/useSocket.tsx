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
import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import io, { type Socket } from 'socket.io-client'
import type { NotablePlayer } from '@/components/Overlay/NotablePlayers'
import type { PollData } from '@/components/Overlay/PollOverlay'
import { Settings } from '@/lib/defaultSettings'
import type { blockType } from '@/lib/devConsts'
import { fetcher } from '@/lib/fetcher'
import { getMatchData, matchDataCache } from '@/lib/hooks/openDotaAPI'
import type { AegisState, RoshanState } from '@/lib/hooks/rosh'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { getRankImage, type RankType } from '@/lib/ranks'
import {
  setMinimapDataBuildings,
  setMinimapDataCouriers,
  setMinimapDataCreeps,
  setMinimapDataHeroes,
  setMinimapDataHeroUnits,
  setMinimapStatus,
} from '../redux/store'

let socket: Socket | null = null

export interface WinChance {
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
interface CourierData {
  // Define courier data structure based on your application
  id: number
  position: [number, number]
  team: number
  // Add other properties as needed
}

interface CreepData {
  // Define creep data structure based on your application
  id: number
  position: [number, number]
  team: number
  // Add other properties as needed
}

interface HeroUnitData {
  // Define hero unit data structure based on your application
  id: number
  position: [number, number]
  team: number
  // Add other properties as needed
}

interface MinimapStatusData {
  // Define status data structure based on your application
  gameState: string
  matchId?: string
  // Add other properties as needed
}

export interface ChatMessage {
  message: string
  timestamp?: number
}

export interface RankImageDetails {
  image: string | null
  rank: number | null
  leaderboard: number | null
  notLoaded?: boolean
}

export interface BetData {
  title: string
  endDate: PollData['endDate']
  outcomes: { title: string; totalVotes: number; channelPoints: number }[]
}

interface UseSocketProps {
  setPollData: Dispatch<SetStateAction<PollData | null>>
  setBetData: Dispatch<SetStateAction<BetData | null>>
  setBlock: Dispatch<SetStateAction<blockType>>
  setPaused: Dispatch<SetStateAction<boolean>>
  setAegis: Dispatch<SetStateAction<AegisState>>
  setNotablePlayers: Dispatch<SetStateAction<NotablePlayer[]>>
  setRoshan: Dispatch<SetStateAction<RoshanState>>
  setConnected: Dispatch<SetStateAction<boolean>>
  setRankImageDetails: Dispatch<SetStateAction<RankImageDetails>>
  setWL: Dispatch<SetStateAction<wlType>>
  setRadiantWinChance: Dispatch<SetStateAction<WinChance | null>>
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
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
  setChatMessages,
}: UseSocketProps) => {
  const router = useRouter()
  const { userId } = router.query
  const dispatch = useDispatch()

  // Can pass any key here, we just want mutate() function on `api/settings`
  const { mutate } = useUpdateSetting(Settings.commandWL)

  // Ref to store timeout IDs for chat message cleanup
  const messageTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  useEffect(() => {
    if (!userId) {
      return
    }

    let lastReceivedTime = Date.now()

    console.log('Connecting to socket init...', { userId })

    // Create socket connection only once per userId
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL, {
        auth: { token: userId },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20_000,
      })

      console.log('Socket instance created:', Boolean(socket))
    }

    // Use socket.io's built-in ping event to track connection health
    socket.io.on('ping', () => {
      lastReceivedTime = Date.now()
    })

    // Monitor for stale connections
    const connectionMonitor = setInterval(() => {
      if (Date.now() - lastReceivedTime > 45_000) {
        // 45s = 3 missed pings
        console.log('Connection appears stale, reconnecting...')
        socket?.disconnect()
        socket?.connect()
      }
    }, 15_000)

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
      const wl = { lose: 0, win: 0 }
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
        heroSlot,
        matchId,
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
      } catch (error) {
        captureException(error)
        console.log('[MMR] Error fetching match data', { error })
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
    socket.on('chatMessage', (data: ChatMessage) => {
      updateLastReceived()
      const messageWithTimestamp = {
        ...data,
        timestamp: data.timestamp || Date.now(),
      }

      // Add message to state
      setChatMessages((prev: ChatMessage[]) => [...prev.slice(-7), messageWithTimestamp])

      // Set up timeout to remove message after 10 seconds
      const messageId = messageWithTimestamp.timestamp.toString()
      const timeoutId = setTimeout(() => {
        setChatMessages((prev: ChatMessage[]) =>
          prev.filter((msg) => msg.timestamp?.toString() !== messageId),
        )
        messageTimeoutsRef.current.delete(messageId)
      }, 10_000) // 10 seconds

      // Store timeout ID for cleanup
      messageTimeoutsRef.current.set(messageId, timeoutId)
    })
    socket.on('roshan-killed', (data) => {
      updateLastReceived()
      setRoshan(data)
    })
    socket.on('auth_error', (message) => {
      console.error('Authentication failed:', message)
      socket?.disconnect()
    })
    socket.on('connect', () => {
      console.log('Socket connected event fired')
      updateLastReceived()
      mutate()
      setConnected(true)
    })
    socket.on('connect_error', (error) => {
      console.error('Connection error event fired:', error)
      setConnected(false)
    })
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected event fired:', reason)
      setConnected(false)
    })

    socket.on('refresh-settings', (_key: typeof Settings) => {
      updateLastReceived()
      mutate()
    })

    socket.on('channelPollOrBet', (data: PollData | BetData, eventName: string) => {
      updateLastReceived()
      console.log('twitchEvent', { data, eventName })
      const isEnd = eventName.includes('End') || eventName.includes('Lock')
      if (eventName.includes('Poll')) {
        setPollData(isEnd || !('choices' in data) ? null : data)
      } else {
        setBetData(isEnd || !('outcomes' in data) ? null : data)
      }
    })

    socket.on('update-medal', (deets: RankType) => {
      updateLastReceived()
      setRankImageDetails(getRankImage(deets))
    })

    socket.on('update-wl', (records: wlType) => {
      updateLastReceived()
      setWL(records)
    })

    socket.on('update-radiant-win-chance', (chanceDetails: WinChance) => {
      updateLastReceived()
      // TODO: set setRadiantWinChance(null) on new match to avoid animation between matches
      if (!chanceDetails) {
        return setRadiantWinChance((prev) => (prev ? { ...prev, visible: false } : null))
      }
      setRadiantWinChance({ ...chanceDetails, visible: true })
    })

    socket.on('refresh', () => {
      updateLastReceived()
      mutate()
    })

    // Clean up
    return () => {
      clearInterval(connectionMonitor)
      // Clear all message timeouts
      messageTimeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId)
      })
      messageTimeoutsRef.current.clear()

      // Don't disconnect the socket on every effect cleanup
      // Only clean up event handlers
      socket?.off('connect')
      socket?.off('connect_error')
      socket?.off('disconnect')
      socket?.off('DATA_buildings')
      socket?.off('DATA_heroes')
      socket?.off('DATA_couriers')
      socket?.off('DATA_creeps')
      socket?.off('DATA_hero_units')
      socket?.off('STATUS')
      socket?.off('requestHeroData')
      socket?.off('requestMatchData')
      socket?.off('block')
      socket?.off('paused')
      socket?.off('notable-players')
      socket?.off('aegis-picked-up')
      socket?.off('chatMessage')
      socket?.off('roshan-killed')
      socket?.off('auth_error')
      socket?.off('refresh-settings')
      socket?.off('channelPollOrBet')
      socket?.off('update-medal')
      socket?.off('update-wl')
      socket?.off('update-radiant-win-chance')
      socket?.off('refresh')
    }
  }, [userId]) // Only depend on userId
}

const _events = {
  subscribeToChannelPollBeginEvents: EventSubChannelPollBeginEvent,
  subscribeToChannelPollEndEvents: EventSubChannelPollEndEvent,
  subscribeToChannelPollProgressEvents: EventSubChannelPollProgressEvent,
  subscribeToChannelPredictionBeginEvents: EventSubChannelPredictionBeginEvent,
  subscribeToChannelPredictionEndEvents: EventSubChannelPredictionEndEvent,
  subscribeToChannelPredictionLockEvents: EventSubChannelPredictionLockEvent,
  subscribeToChannelPredictionProgressEvents: EventSubChannelPredictionProgressEvent,
}
