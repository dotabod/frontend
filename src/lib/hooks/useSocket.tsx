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

  useEffect(() => {
    if (!userId) return

    console.log('Connecting to socket init...')

    socket = io(process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL, {
      auth: { token: userId },
    })

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
    socket.on('connect_error', (err) => {
      setTimeout(() => {
        console.log('Reconnecting due to connect error...', { err })
        socket.connect()
      }, 4000)
    })
    socket.on('disconnect', (reason) => {
      setConnected(false)
      console.log('Disconnected from socket', { reason })

      if (reason === 'io server disconnect') {
        console.log('Reconnecting...')
        // the disconnection was initiated by the server, need to reconnect manually
        socket.connect()
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
