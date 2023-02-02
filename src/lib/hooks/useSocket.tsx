import { useEffect } from 'react'
import io, { Socket } from 'socket.io-client'
import { getRankImage, RankType } from '@/lib/ranks'
import { useRouter } from 'next/router'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import {
  EventSubChannelPollBeginEvent,
  EventSubChannelPollEndEvent,
  EventSubChannelPollProgressEvent,
  EventSubChannelPredictionBeginEvent,
  EventSubChannelPredictionEndEvent,
  EventSubChannelPredictionLockEvent,
  EventSubChannelPredictionProgressEvent,
} from '@twurple/eventsub-base'
import { isDev } from '@/lib/hooks/rosh'
import { fetcher } from '@/lib/fetcher'
import { blockType } from '@/lib/devConsts'

export let socket: Socket | null = null

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
  setRoshan,
  setConnected,
  setRankImageDetails,
  setWL,
}) => {
  const router = useRouter()
  const { userId } = router.query

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
      socket?.off('channelPollOrBet')
      socket?.off('update-medal')
      socket?.off('update-wl')
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

    socket.on(
      'requestHeroData',
      ({ data: { allTime, heroId, steam32Id } }, cb) => {
        fetcher(
          `https://api.opendota.com/api/players/${steam32Id}/wl/?hero_id=${heroId}&having=1${
            allTime ? '' : '&date=30'
          }`
        )
          .then(({ win = 0, lose = 0 }) => {
            cb({ win, lose })
          })
          .catch((e: any) => {
            cb({ win: 0, lose: 0 })
          })
      }
    )

    socket.on('block', (data: blockType) => {
      if (data.type === 'playing') {
        setTimeout(() => {
          setBlock(data)
        }, 5000)
      } else {
        setBlock(data)
      }
    })
    socket.on('paused', setPaused)
    socket.on('aegis-picked-up', setAegis)
    socket.on('roshan-killed', setRoshan)
    socket.on('connect', () => setConnected(true))
    socket.on('connect_error', () => {
      setTimeout(() => {
        console.log('Reconnecting due to connect error...')
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
