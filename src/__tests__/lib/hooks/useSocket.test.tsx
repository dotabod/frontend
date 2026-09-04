import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { useSocket } from '@/lib/hooks/useSocket'

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
}))

vi.mock('next/router', () => ({
  useRouter: () => ({
    query: { userId: 'overlay-token' },
  }),
}))

vi.mock('react-redux', () => ({
  useDispatch: () => socketState.dispatch,
}))

vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  useUpdateSetting: () => ({
    mutate: socketState.mutate,
  }),
}))

describe('useSocket', () => {
  afterEach(() => {
    cleanup()
    socketState.handlers.clear()
    socketState.ioHandlers.clear()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('refreshes settings on socket connect and refresh-settings events', () => {
    vi.useFakeTimers()
    const setConnected = vi.fn()

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

    expect(socketState.ioMock).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL,
      expect.objectContaining({ reconnectionAttempts: Number.POSITIVE_INFINITY }),
    )

    act(() => {
      socketState.handlers.get('connect')?.()
    })

    expect(socketState.mutate).toHaveBeenCalledTimes(1)
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
      socketState.handlers.get('update-wl')?.(records, 30)
    })

    expect(setWL).toHaveBeenCalledWith({ records, statsDays: 30 })
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

    expect(setWL).toHaveBeenCalledWith({ records, statsDays: null })
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
        matchId: 8978976957,
        state: 'DOTA_GAMERULES_STATE_POST_GAME',
        team: 'radiant',
        type: 'empty',
      })
    })

    expect(setBlock).toHaveBeenCalledWith({
      matchId: 8978976957,
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
        matchId: 8978976957,
        state: 'DOTA_GAMERULES_STATE_INIT',
        team: 'radiant',
        type: 'empty',
      })
    })

    expect(setBlock).toHaveBeenCalledWith({
      matchId: 8978976957,
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
        matchId: 8978976957,
        state: 'DOTA_GAMERULES_STATE_STRATEGY_TIME',
        team: 'radiant',
        type: 'empty',
      })
    })

    expect(setBlock).toHaveBeenCalledWith({
      matchId: 8978976957,
      state: 'DOTA_GAMERULES_STATE_STRATEGY_TIME',
      team: 'radiant',
      type: 'empty',
    })
  })
})
