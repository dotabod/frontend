import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSocket } from '@/lib/hooks/use-socket'

type SocketHandler = (...args: unknown[]) => void

const socketState = vi.hoisted(() => {
  const handlers = new Map<string, SocketHandler>()
  const ioHandlers = new Map<string, SocketHandler>()
  const socket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    io: {
      on: vi.fn((event: string, handler: SocketHandler) => {
        ioHandlers.set(event, handler)
      }),
    },
    off: vi.fn(),
    on: vi.fn((event: string, handler: SocketHandler) => {
      handlers.set(event, handler)
      return socket
    }),
  }

  return {
    dispatch: vi.fn(),
    handlers,
    ioHandlers,
    ioMock: vi.fn(() => socket),
    mutate: vi.fn(),
    socket,
  }
})

vi.mock('socket.io-client', () => ({
  default: socketState.ioMock,
  io: socketState.ioMock,
}))

vi.mock('next/router', () => ({
  useRouter: () => ({
    query: { userId: 'overlay-token' },
  }),
}))

vi.mock('react-redux', () => ({
  useDispatch: () => socketState.dispatch,
}))

vi.mock('@/lib/hooks/use-update-setting', () => ({
  useUpdateSetting: () => ({
    mutate: socketState.mutate,
  }),
}))

describe(useSocket, () => {
  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(window, 'obsstudio')
    socketState.handlers.clear()
    socketState.ioHandlers.clear()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('refreshes settings and reports the OBS page only when diagnostics probes it', () => {
    vi.useFakeTimers()
    const setConnected = vi.fn()
    Object.defineProperty(window, 'obsstudio', { configurable: true, value: {} })
    const fetchMock = vi.fn<typeof fetch>(
      async () => await Promise.resolve(new Response(null, { status: 204 })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const TestComponent = () => {
      useSocket({
        setAegis: vi.fn(),
        setBetData: vi.fn(),
        setBlock: vi.fn(),
        setChatMessages: vi.fn(),
        setConnected,
        setNotablePlayers: vi.fn(),
        setPaused: vi.fn(),
        setPollData: vi.fn(),
        setRadiantWinChance: vi.fn(),
        setRankImageDetails: vi.fn(),
        setRoshan: vi.fn(),
        setWL: vi.fn(),
      })

      return null
    }

    render(<TestComponent />)
    expect(fetchMock).not.toHaveBeenCalled()

    expect(socketState.ioMock).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL,
      expect.objectContaining({ reconnectionAttempts: Number.POSITIVE_INFINITY }),
    )

    act(() => {
      socketState.handlers.get('diagnostic-overlay-probe')?.()
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/diagnostics/overlay-page', {
      body: JSON.stringify({ userId: 'overlay-token' }),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      method: 'POST',
    })

    act(() => {
      socketState.handlers.get('connect')?.()
    })

    expect(socketState.mutate).toHaveBeenCalledOnce()
    expect(setConnected).toHaveBeenCalledWith(true)

    act(() => {
      socketState.handlers.get('refresh-settings')?.('mutate')
    })

    expect(socketState.mutate).toHaveBeenCalledTimes(2)
  })

  it('stores the WL records with the stats window sent by the server', () => {
    const setWL = vi.fn()

    const TestComponent = () => {
      useSocket({
        setAegis: vi.fn(),
        setBetData: vi.fn(),
        setBlock: vi.fn(),
        setChatMessages: vi.fn(),
        setConnected: vi.fn(),
        setNotablePlayers: vi.fn(),
        setPaused: vi.fn(),
        setPollData: vi.fn(),
        setRadiantWinChance: vi.fn(),
        setRankImageDetails: vi.fn(),
        setRoshan: vi.fn(),
        setWL,
      })

      return null
    }

    render(<TestComponent />)

    const records = [{ lose: 5, type: 'R', win: 10 }]
    act(() => {
      socketState.handlers.get('update-wl')?.(records, 14, 30)
    })

    expect(setWL).toHaveBeenCalledWith({ records, statsDays: 14, statsDaysTotal: 30 })
  })

  it('treats legacy WL socket updates without a window as this stream', () => {
    const setWL = vi.fn()

    const TestComponent = () => {
      useSocket({
        setAegis: vi.fn(),
        setBetData: vi.fn(),
        setBlock: vi.fn(),
        setChatMessages: vi.fn(),
        setConnected: vi.fn(),
        setNotablePlayers: vi.fn(),
        setPaused: vi.fn(),
        setPollData: vi.fn(),
        setRadiantWinChance: vi.fn(),
        setRankImageDetails: vi.fn(),
        setRoshan: vi.fn(),
        setWL,
      })

      return null
    }

    render(<TestComponent />)

    const records = [{ lose: 5, type: 'R', win: 10 }]
    act(() => {
      socketState.handlers.get('update-wl')?.(records)
    })

    expect(setWL).toHaveBeenCalledWith({ records, statsDays: null, statsDaysTotal: null })
  })

  it('normalizes the legacy empty block state to the main-screen state', () => {
    const setBlock = vi.fn()

    const TestComponent = () => {
      useSocket({
        setAegis: vi.fn(),
        setBetData: vi.fn(),
        setBlock,
        setChatMessages: vi.fn(),
        setConnected: vi.fn(),
        setNotablePlayers: vi.fn(),
        setPaused: vi.fn(),
        setPollData: vi.fn(),
        setRadiantWinChance: vi.fn(),
        setRankImageDetails: vi.fn(),
        setRoshan: vi.fn(),
        setWL: vi.fn(),
      })

      return null
    }

    render(<TestComponent />)

    act(() => {
      socketState.handlers.get('block')?.({
        matchId: 8_978_976_957,
        state: 'DOTA_GAMERULES_STATE_POST_GAME',
        team: 'radiant',
        type: 'empty',
      })
    })

    expect(setBlock).toHaveBeenCalledWith({
      matchId: 8_978_976_957,
      state: 'DOTA_GAMERULES_STATE_POST_GAME',
      team: 'radiant',
      type: null,
    })
  })

  it('normalizes a legacy main-menu init state after reconnecting', () => {
    const setBlock = vi.fn()

    const TestComponent = () => {
      useSocket({
        setAegis: vi.fn(),
        setBetData: vi.fn(),
        setBlock,
        setChatMessages: vi.fn(),
        setConnected: vi.fn(),
        setNotablePlayers: vi.fn(),
        setPaused: vi.fn(),
        setPollData: vi.fn(),
        setRadiantWinChance: vi.fn(),
        setRankImageDetails: vi.fn(),
        setRoshan: vi.fn(),
        setWL: vi.fn(),
      })

      return null
    }

    render(<TestComponent />)

    act(() => {
      socketState.handlers.get('block')?.({
        matchId: 8_978_976_957,
        state: 'DOTA_GAMERULES_STATE_INIT',
        team: 'radiant',
        type: 'empty',
      })
    })

    expect(setBlock).toHaveBeenCalledWith({
      matchId: 8_978_976_957,
      state: 'DOTA_GAMERULES_STATE_INIT',
      team: 'radiant',
      type: null,
    })
  })

  it('preserves empty block states while a match is still loading', () => {
    const setBlock = vi.fn()

    const TestComponent = () => {
      useSocket({
        setAegis: vi.fn(),
        setBetData: vi.fn(),
        setBlock,
        setChatMessages: vi.fn(),
        setConnected: vi.fn(),
        setNotablePlayers: vi.fn(),
        setPaused: vi.fn(),
        setPollData: vi.fn(),
        setRadiantWinChance: vi.fn(),
        setRankImageDetails: vi.fn(),
        setRoshan: vi.fn(),
        setWL: vi.fn(),
      })

      return null
    }

    render(<TestComponent />)

    act(() => {
      socketState.handlers.get('block')?.({
        matchId: 8_978_976_957,
        state: 'DOTA_GAMERULES_STATE_STRATEGY_TIME',
        team: 'radiant',
        type: 'empty',
      })
    })

    expect(setBlock).toHaveBeenCalledWith({
      matchId: 8_978_976_957,
      state: 'DOTA_GAMERULES_STATE_STRATEGY_TIME',
      team: 'radiant',
      type: 'empty',
    })
  })
})
