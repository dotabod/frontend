import { act, cleanup, render, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAegis, useRoshan } from '@/lib/hooks/rosh'
import { useSocket } from '@/lib/hooks/use-socket'

type SocketHandler = (...args: unknown[]) => void
type SocketProps = Parameters<typeof useSocket>[0]

const socketState = vi.hoisted(() => {
  const handlers = new Map<string, SocketHandler>()
  const ioHandlers = new Map<string, Set<SocketHandler>>()
  const socket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    io: {
      off: vi.fn<(event: string, handler: SocketHandler) => void>((event, handler) => {
        ioHandlers.get(event)?.delete(handler)
      }),
      on: vi.fn<(event: string, handler: SocketHandler) => void>((event, handler) => {
        const eventHandlers = ioHandlers.get(event) ?? new Set<SocketHandler>()
        eventHandlers.add(handler)
        ioHandlers.set(event, eventHandlers)
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

const createSocketProps = (overrides: Partial<SocketProps> = {}): SocketProps => ({
  setAegis: vi.fn<SocketProps['setAegis']>(),
  setBetData: vi.fn<SocketProps['setBetData']>(),
  setBlock: vi.fn<SocketProps['setBlock']>(),
  setChatMessages: vi.fn<SocketProps['setChatMessages']>(),
  setConnected: vi.fn<SocketProps['setConnected']>(),
  setNotablePlayers: vi.fn<SocketProps['setNotablePlayers']>(),
  setPaused: vi.fn<SocketProps['setPaused']>(),
  setPollData: vi.fn<SocketProps['setPollData']>(),
  setRadiantWinChance: vi.fn<SocketProps['setRadiantWinChance']>(),
  setRankImageDetails: vi.fn<SocketProps['setRankImageDetails']>(),
  setRoshan: vi.fn<SocketProps['setRoshan']>(),
  setWL: vi.fn<SocketProps['setWL']>(),
  ...overrides,
})

describe(useSocket, () => {
  afterEach(() => {
    cleanup()
    socketState.handlers.clear()
    socketState.ioHandlers.clear()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('refreshes settings on socket connect and refresh-settings events', () => {
    vi.useFakeTimers()
    const setConnected = vi.fn<SocketProps['setConnected']>()
    const socketProps = createSocketProps({ setConnected })

    renderHook(() => {
      useSocket(socketProps)
    })

    expect(socketState.ioMock).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL,
      expect.objectContaining({ reconnectionAttempts: Number.POSITIVE_INFINITY }),
    )

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
    const setWL = vi.fn<SocketProps['setWL']>()
    const socketProps = createSocketProps({ setWL })

    renderHook(() => {
      useSocket(socketProps)
    })

    const records = [{ lose: 5, type: 'R', win: 10 }]
    act(() => {
      socketState.handlers.get('update-wl')?.(records, 14, 30)
    })

    expect(setWL).toHaveBeenCalledWith({ records, statsDays: 14, statsDaysTotal: 30 })
  })

  it('treats legacy WL socket updates without a window as this stream', () => {
    const setWL = vi.fn<SocketProps['setWL']>()
    const socketProps = createSocketProps({ setWL })

    renderHook(() => {
      useSocket(socketProps)
    })

    const records = [{ lose: 5, type: 'R', win: 10 }]
    act(() => {
      socketState.handlers.get('update-wl')?.(records)
    })

    expect(setWL).toHaveBeenCalledWith({ records, statsDays: null, statsDaysTotal: null })
  })

  it('normalizes the legacy empty block state to the main-screen state', () => {
    const setBlock = vi.fn<SocketProps['setBlock']>()
    const socketProps = createSocketProps({ setBlock })

    renderHook(() => {
      useSocket(socketProps)
    })

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
    const setBlock = vi.fn<SocketProps['setBlock']>()
    const socketProps = createSocketProps({ setBlock })

    renderHook(() => {
      useSocket(socketProps)
    })

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
    const setBlock = vi.fn<SocketProps['setBlock']>()
    const socketProps = createSocketProps({ setBlock })

    renderHook(() => {
      useSocket(socketProps)
    })

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

  it('keeps the first playing deadline while updating its pending payload', () => {
    vi.useFakeTimers()
    const setBlock = vi.fn<SocketProps['setBlock']>()
    const socketProps = createSocketProps({ setBlock })

    renderHook(() => {
      useSocket(socketProps)
    })

    act(() => {
      socketState.handlers.get('block')?.({ matchId: 1, team: 'radiant', type: 'playing' })
      vi.advanceTimersByTime(4000)
      socketState.handlers.get('block')?.({ matchId: 2, team: 'dire', type: 'playing' })
      vi.advanceTimersByTime(1000)
    })

    expect(setBlock).toHaveBeenCalledExactlyOnceWith({
      matchId: 2,
      team: 'dire',
      type: 'playing',
    })
  })

  it('cancels a pending playing state when a newer non-playing state arrives', () => {
    vi.useFakeTimers()
    const setBlock = vi.fn<SocketProps['setBlock']>()
    const socketProps = createSocketProps({ setBlock })

    renderHook(() => {
      useSocket(socketProps)
    })

    act(() => {
      socketState.handlers.get('block')?.({ matchId: 1, team: 'radiant', type: 'playing' })
      vi.advanceTimersByTime(4000)
      socketState.handlers.get('block')?.({ matchId: 1, team: 'radiant', type: 'strategy' })
      vi.advanceTimersByTime(1000)
    })

    expect(setBlock).toHaveBeenCalledExactlyOnceWith({
      matchId: 1,
      team: 'radiant',
      type: 'strategy',
    })
  })

  it('reports the OBS overlay page once when diagnostics requests a probe', () => {
    Object.defineProperty(window, 'obsstudio', { configurable: true, value: {} })
    const fetchMock = vi.fn<typeof fetch>(
      async () => await Promise.resolve(new Response(null, { status: 204 })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const socketProps = createSocketProps()

    try {
      renderHook(() => {
        useSocket(socketProps)
      })
      expect(fetchMock).not.toHaveBeenCalled()

      act(() => {
        socketState.handlers.get('diagnostic-overlay-probe')?.()
      })

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/diagnostics/overlay-page', {
        body: JSON.stringify({ userId: 'overlay-token' }),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        method: 'POST',
      })
    } finally {
      Reflect.deleteProperty(window, 'obsstudio')
      vi.unstubAllGlobals()
    }
  })

  it('removes translated chat messages after ten seconds across rerenders', () => {
    vi.useFakeTimers()
    const setChatMessages = vi.fn<SocketProps['setChatMessages']>()
    const socketProps = createSocketProps({ setChatMessages })

    const { rerender } = renderHook(
      ({ setRoshan }) => {
        useSocket({ ...socketProps, setRoshan })
      },
      {
        initialProps: { setRoshan: socketProps.setRoshan },
      },
    )

    act(() => {
      socketState.handlers.get('chatMessage')?.({ message: 'Translated message', timestamp: 1 })
    })
    expect(setChatMessages).toHaveBeenCalledOnce()

    rerender({ setRoshan: vi.fn<SocketProps['setRoshan']>() })

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(setChatMessages).toHaveBeenCalledTimes(2)
  })

  it('keeps real Roshan and Aegis setters stable across overlay rerenders', () => {
    const socketProps = createSocketProps()

    const TestComponent = () => {
      const [, setRenderCount] = useState(0)
      const { setAegis } = useAegis()
      const { setRoshan } = useRoshan()
      useSocket({ ...socketProps, setAegis, setRoshan })

      return (
        <button
          type='button'
          onClick={() => {
            setRenderCount((count) => count + 1)
          }}
        >
          rerender
        </button>
      )
    }

    const { getByRole } = render(<TestComponent />)
    const socketOnCalls = socketState.socket.on.mock.calls.length

    act(() => {
      getByRole('button').click()
    })

    expect(socketState.socket.on).toHaveBeenCalledTimes(socketOnCalls)
    expect(socketState.ioHandlers.get('ping')?.size).toBe(1)
  })

  it('removes its ping listener when the overlay unmounts', () => {
    const socketProps = createSocketProps()

    const { unmount } = renderHook(() => {
      useSocket(socketProps)
    })

    expect(socketState.ioHandlers.get('ping')?.size).toBe(1)

    unmount()

    expect(socketState.ioHandlers.get('ping')?.size).toBe(0)
  })
})
