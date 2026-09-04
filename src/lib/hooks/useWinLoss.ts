import { useEffect, useRef, useState } from 'react'
import io, { type Socket } from 'socket.io-client'
import type { WLData, WLRecord } from './useSocket'

type WinLossResponse =
  | WLData
  | {
      error: string
    }

interface UseWinLossOptions {
  statsDays?: number | null
  twitchId?: string | null
  userId?: string | null
}

function isWinLossData(response: WinLossResponse): response is WLData {
  return 'records' in response && Array.isArray(response.records)
}

export function useWinLoss({ statsDays, twitchId, userId }: UseWinLossOptions) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [wl, setWL] = useState<WLData | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const statsDaysRef = useRef(statsDays)
  const lastRequestedWindowRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)
  const isPreview = userId != null

  statsDaysRef.current = statsDays

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
      const requestKey = currentStatsDays === undefined ? 'configured' : String(currentStatsDays)
      if (!force && lastRequestedWindowRef.current === requestKey) return

      lastRequestedWindowRef.current = requestKey
      const requestId = ++requestIdRef.current
      socket.emit(
        'request-wl',
        currentStatsDays === undefined ? {} : { statsDays: currentStatsDays },
        (response: WinLossResponse) => {
          if (requestId !== requestIdRef.current) return
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

    const handleConnect = () => {
      setConnected(true)
      requestCurrentWL(true)
    }
    const handleDisconnect = () => setConnected(false)
    const handleUpdate = (records: WLRecord[], updatedStatsDays: number | null = null) => {
      if (isPreview) {
        requestCurrentWL(true)
        return
      }
      requestIdRef.current += 1
      setWL({ records, statsDays: updatedStatsDays })
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
      lastRequestedWindowRef.current = null
    }
  }, [isPreview, twitchId, userId])

  useEffect(() => {
    if (!isPreview || !socketRef.current?.connected) return

    const requestKey = statsDays === undefined ? 'configured' : String(statsDays)
    if (lastRequestedWindowRef.current === requestKey) return

    lastRequestedWindowRef.current = requestKey
    const requestId = ++requestIdRef.current
    setLoading(true)
    socketRef.current.emit(
      'request-wl',
      statsDays === undefined ? {} : { statsDays },
      (response: WinLossResponse) => {
        if (requestId !== requestIdRef.current) return
        setLoading(false)
        if (!isWinLossData(response)) {
          setError(response.error)
          return
        }
        setError(null)
        setWL(response)
      },
    )
  }, [isPreview, statsDays])

  return { connected, error, loading, wl }
}
