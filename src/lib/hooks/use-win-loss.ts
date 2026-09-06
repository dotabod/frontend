import { useCallback, useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import type { Socket } from 'socket.io-client'

import type { WLData, WLRecord } from './use-socket'

type WinLossResponse =
  | WLData
  | {
      error: string
    }

interface UseWinLossOptions {
  statsDays?: number | null
  statsStartDate?: string | null
  twitchId?: string | null
  userId?: string | null
}

const isWinLossData = function isWinLossData(response: WinLossResponse): response is WLData {
  return 'records' in response && Array.isArray(response.records)
}

export const useWinLoss = function useWinLoss({
  statsDays,
  statsStartDate,
  twitchId,
  userId,
}: UseWinLossOptions) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [wl, setWL] = useState<WLData | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const statsDaysRef = useRef(statsDays)
  const statsStartDateRef = useRef(statsStartDate)
  const lastRequestedWindowRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)
  const requestCurrentWLRef = useRef<((force?: boolean) => void) | null>(null)
  const isPreview = userId != null

  statsDaysRef.current = statsDays
  statsStartDateRef.current = statsStartDate

  useEffect(() => {
    const identifier = isPreview ? userId : twitchId
    if (!identifier) {
      setLoading(false)
      return
    }

    const socket = io(process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL, {
      auth: isPreview
        ? { client: 'win-loss', token: identifier }
        : { client: 'profile-wl', twitchId: identifier },
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20_000,
    })
    socketRef.current = socket

    const requestCurrentWL = (force = false) => {
      const currentStatsDays = statsDaysRef.current
      const currentStatsStartDate = statsStartDateRef.current
      const requestKey =
        currentStatsDays === undefined && currentStatsStartDate === undefined
          ? 'configured'
          : `${String(currentStatsDays)}:${String(currentStatsStartDate)}`
      if (!force && lastRequestedWindowRef.current === requestKey) {
        return
      }

      lastRequestedWindowRef.current = requestKey
      requestIdRef.current += 1
      const requestId = requestIdRef.current
      socket.emit(
        'request-wl',
        currentStatsDays === undefined && currentStatsStartDate === undefined
          ? {}
          : { statsDays: currentStatsDays, statsStartDate: currentStatsStartDate },
        (response: WinLossResponse) => {
          if (requestId !== requestIdRef.current) {
            return
          }
          setLoading(false)
          if (!isWinLossData(response)) {
            setError(response.error)
            return
          }
          setError(null)
          setWL(response)
        },
      )
    }
    requestCurrentWLRef.current = requestCurrentWL

    const handleConnect = () => {
      setConnected(true)
      requestCurrentWL(true)
    }
    const handleDisconnect = () => {
      setConnected(false)
    }
    const handleUpdate = (
      records: WLRecord[],
      updatedStatsDays: number | null = null,
      statsDaysTotal: number | null = null,
    ) => {
      if (isPreview) {
        requestCurrentWL(true)
        return
      }
      requestIdRef.current += 1
      setWL({ records, statsDays: updatedStatsDays, statsDaysTotal })
      setLoading(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleDisconnect)
    socket.on('update-wl', handleUpdate)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleDisconnect)
      socket.off('update-wl', handleUpdate)
      socket.disconnect()
      requestIdRef.current += 1
      socketRef.current = null
      requestCurrentWLRef.current = null
      lastRequestedWindowRef.current = null
    }
  }, [isPreview, twitchId, userId])

  useEffect(() => {
    if (!isPreview || !socketRef.current?.connected) {
      return
    }

    const requestKey =
      statsDays === undefined && statsStartDate === undefined
        ? 'configured'
        : `${String(statsDays)}:${String(statsStartDate)}`
    if (lastRequestedWindowRef.current === requestKey) {
      return
    }

    lastRequestedWindowRef.current = requestKey
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    setLoading(true)
    socketRef.current.emit(
      'request-wl',
      statsDays === undefined && statsStartDate === undefined ? {} : { statsDays, statsStartDate },
      (response: WinLossResponse) => {
        if (requestId !== requestIdRef.current) {
          return
        }
        setLoading(false)
        if (!isWinLossData(response)) {
          setError(response.error)
          return
        }
        setError(null)
        setWL(response)
      },
    )
  }, [isPreview, statsDays, statsStartDate])

  const refresh = useCallback(() => requestCurrentWLRef.current?.(true), [])

  return { connected, error, loading, refresh, wl }
}
