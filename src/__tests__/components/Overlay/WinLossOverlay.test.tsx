import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import WinLossOverlay from '@/components/Overlay/WinLossOverlay'

const updateStatsDays = vi.hoisted(() => vi.fn())
const settingsState = vi.hoisted<{ statsDays: number | null }>(() => ({ statsDays: 7 }))
const socketState = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>()
  const pendingResponses: Array<{
    callback: (response: unknown) => void
    request: { statsDays?: number | null }
  }> = []
  const control = { autoRespond: true }
  const socket = {
    connected: true,
    disconnect: vi.fn(),
    emit: vi.fn(
      (
        event: string,
        request: { statsDays?: number | null },
        callback: (response: unknown) => void,
      ) => {
        if (event !== 'request-wl') return
        if (!control.autoRespond) {
          pendingResponses.push({ callback, request })
          return
        }
        const statsDays = request.statsDays ?? null
        callback({
          records: [{ lose: 4, type: 'R', win: statsDays ?? 12 }],
          statsDays,
        })
      },
    ),
    off: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler)
      return socket
    }),
  }

  return { control, handlers, io: vi.fn(() => socket), pendingResponses, socket }
})

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'user-1' } } }),
}))

vi.mock('socket.io-client', () => ({
  default: socketState.io,
}))

vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  useUpdateSetting: (key?: string) => ({
    data: key === 'wlStatsDays' ? settingsState.statsDays : true,
    loading: false,
    updateSetting: key === 'wlStatsDays' ? updateStatsDays : vi.fn(),
  }),
}))

vi.mock('@/components/Dashboard/Features/TierSwitch', () => ({
  TierSwitch: ({ label }: { label: string }) => <div>{label}</div>,
}))

vi.mock('@/components/Overlay/wl/WinLossCard', () => ({
  default: ({
    wl,
  }: {
    wl: { records: Array<{ lose: number; win: number }>; statsDays: number | null }
  }) => (
    <div data-testid='preview-window'>
      {wl.records[0].win} W - {wl.records[0].lose} L ·{' '}
      {wl.statsDays === null ? 'stream' : wl.statsDays}
    </div>
  ),
}))

vi.mock('@/ui/card', () => ({
  Card: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}))

describe('WinLossOverlay', () => {
  afterEach(() => {
    vi.useRealTimers()
    updateStatsDays.mockReset()
    settingsState.statsDays = 7
    socketState.handlers.clear()
    socketState.pendingResponses.length = 0
    socketState.control.autoRespond = true
    socketState.io.mockClear()
    socketState.socket.disconnect.mockClear()
    socketState.socket.emit.mockClear()
    socketState.socket.off.mockClear()
    socketState.socket.on.mockClear()
  })

  it("previews the user's current WL instead of a sample record", () => {
    render(<WinLossOverlay />)

    expect(screen.getByTestId('preview-window')).toHaveTextContent('7 W - 4 L · 7')
    expect(socketState.io).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL,
      expect.objectContaining({ auth: { client: 'win-loss', token: 'user-1' } }),
    )
  })

  it('saves the rolling number of days used by the overlay and !wl', () => {
    vi.useFakeTimers()
    render(<WinLossOverlay />)

    const input = screen.getByRole('spinbutton', { name: 'Stats window' })
    expect(input).toHaveValue('7')

    fireEvent.change(input, { target: { value: '30' } })

    expect(updateStatsDays).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(updateStatsDays).toHaveBeenCalledWith(30)
    expect(screen.getByTestId('preview-window')).toHaveTextContent('30 W - 4 L · 30')
    expect(screen.getByText(/Last 30 days.*keeps counting across streams/i)).toBeInTheDocument()
    expect(screen.getByText(/!today always shows today's stats/i)).toBeInTheDocument()
  })

  it('keeps the newest preview when an older request finishes later', () => {
    socketState.control.autoRespond = false
    render(<WinLossOverlay />)

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Stats window' }), {
      target: { value: '30' },
    })

    expect(socketState.pendingResponses.map(({ request }) => request)).toEqual([
      { statsDays: 7 },
      { statsDays: 30 },
    ])

    act(() => {
      socketState.pendingResponses[1].callback({
        records: [{ lose: 4, type: 'R', win: 30 }],
        statsDays: 30,
      })
    })
    expect(screen.getByTestId('preview-window')).toHaveTextContent('30 W - 4 L · 30')

    act(() => {
      socketState.pendingResponses[0].callback({
        records: [{ lose: 4, type: 'R', win: 7 }],
        statsDays: 7,
      })
    })
    expect(screen.getByTestId('preview-window')).toHaveTextContent('30 W - 4 L · 30')
  })

  it('keeps existing users per stream with a clearly explained blank value', () => {
    settingsState.statsDays = null
    render(<WinLossOverlay />)

    const input = screen.getByRole('spinbutton', { name: 'Stats window' })
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('placeholder', 'This stream')
    expect(input).toHaveAttribute('aria-valuemin', '1')
    expect(input).toHaveAttribute('aria-valuemax', '365')
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByText(/This stream.*resets when a new stream starts/i)).toBeInTheDocument()
    expect(screen.getByText(/Leave blank for each stream.*enter 1.*365 days/i)).toBeInTheDocument()
    expect(screen.getByTestId('preview-window')).toHaveTextContent('12 W - 4 L · stream')
  })

  it('clears a rolling counter back to per-stream mode without saving a queued day value', () => {
    vi.useFakeTimers()
    render(<WinLossOverlay />)

    const input = screen.getByRole('spinbutton', { name: 'Stats window' })
    fireEvent.change(input, { target: { value: '30' } })
    fireEvent.change(input, { target: { value: '' } })

    expect(updateStatsDays).toHaveBeenCalledWith(null)
    expect(input).toHaveValue('')
    expect(screen.getByTestId('preview-window')).toHaveTextContent('12 W - 4 L · stream')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(updateStatsDays).toHaveBeenCalledTimes(1)
  })
})
