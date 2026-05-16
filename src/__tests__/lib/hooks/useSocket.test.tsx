import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
})
