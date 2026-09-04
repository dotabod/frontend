import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import WinLossOverlay from '@/components/Overlay/WinLossOverlay'

const updateStatsDays = vi.hoisted(() => vi.fn())
const updateStatsStartDate = vi.hoisted(() => vi.fn())
const settingsState = vi.hoisted<{ statsDays: number | null; statsStartDate: string | null }>(
  () => ({
    statsDays: 30,
    statsStartDate: '2026-08-21',
  }),
)
const socketState = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>()
  const pendingResponses: Array<{
    callback: (response: unknown) => void
    request: { statsDays?: number | null; statsStartDate?: string | null }
  }> = []
  const control: {
    autoRespond: boolean
    records: Array<{ lose: number; type: 'R' | 'U'; win: number }> | null
  } = { autoRespond: true, records: null }
  const socket = {
    connected: true,
    disconnect: vi.fn(),
    emit: vi.fn(
      (
        event: string,
        request: { statsDays?: number | null; statsStartDate?: string | null },
        callback: (response: unknown) => void,
      ) => {
        if (event !== 'request-wl') return
        if (!control.autoRespond) {
          pendingResponses.push({ callback, request })
          return
        }
        const statsDays = request.statsDays ?? null
        const statsDaysTotal = request.statsStartDate ? statsDays : null
        callback({
          records: control.records ?? [{ lose: 4, type: 'R', win: statsDaysTotal ? 14 : 12 }],
          statsDays: statsDaysTotal ? 14 : statsDays,
          statsDaysTotal,
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
    data:
      key === 'wlStatsDays'
        ? settingsState.statsDays
        : key === 'wlStatsStartDate'
          ? settingsState.statsStartDate
          : true,
    loading: false,
    updateSetting:
      key === 'wlStatsDays'
        ? updateStatsDays
        : key === 'wlStatsStartDate'
          ? updateStatsStartDate
          : vi.fn(),
  }),
}))

vi.mock('@/components/Dashboard/Features/TierSwitch', () => ({
  TierSwitch: ({ label }: { label: string }) => <div>{label}</div>,
}))

vi.mock('@/components/Overlay/wl/WinLossCard', () => ({
  default: ({
    wl,
  }: {
    wl: {
      records: Array<{ lose: number; win: number }>
      statsDays: number | null
      statsDaysTotal?: number | null
    }
  }) => (
    <div data-testid='preview-window'>
      {wl.records[0].win} W - {wl.records[0].lose} L ·{' '}
      {wl.statsDays === null
        ? 'stream'
        : wl.statsDaysTotal
          ? `${wl.statsDays}/${wl.statsDaysTotal}`
          : wl.statsDays}
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
    updateStatsStartDate.mockReset()
    settingsState.statsDays = 30
    settingsState.statsStartDate = '2026-08-21'
    socketState.handlers.clear()
    socketState.pendingResponses.length = 0
    socketState.control.autoRespond = true
    socketState.control.records = null
    socketState.io.mockClear()
    socketState.socket.disconnect.mockClear()
    socketState.socket.emit.mockClear()
    socketState.socket.off.mockClear()
    socketState.socket.on.mockClear()
    vi.unstubAllGlobals()
  })

  it("previews the user's current WL instead of a sample record", () => {
    render(<WinLossOverlay />)

    expect(screen.getByTestId('preview-window')).toHaveTextContent('14 W - 4 L · 14/30')
    expect(socketState.io).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL,
      expect.objectContaining({ auth: { client: 'win-loss', token: 'user-1' } }),
    )
  })

  it('saves a fixed challenge start date and duration together', () => {
    render(<WinLossOverlay />)

    fireEvent.change(screen.getByLabelText('Challenge start date'), {
      target: { value: '2026-08-20' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Challenge duration' }), {
      target: { value: '45' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save challenge' }))

    expect(updateStatsStartDate).toHaveBeenCalledWith('2026-08-20')
    expect(updateStatsDays).toHaveBeenCalledWith(45)
    expect(screen.getByText(/ends automatically.*returns to per-stream/i)).toBeInTheDocument()
  })

  it('requests the preview with the fixed challenge boundaries', () => {
    socketState.control.autoRespond = false
    render(<WinLossOverlay />)

    expect(socketState.pendingResponses.map(({ request }) => request)).toEqual([
      { statsDays: 30, statsStartDate: '2026-08-21' },
    ])

    act(() => {
      socketState.pendingResponses[0].callback({
        records: [{ lose: 4, type: 'R', win: 30 }],
        statsDays: 14,
        statsDaysTotal: 30,
      })
    })
    expect(screen.getByTestId('preview-window')).toHaveTextContent('30 W - 4 L · 14/30')
  })

  it('keeps users per stream when no challenge is configured', () => {
    settingsState.statsDays = null
    settingsState.statsStartDate = null
    render(<WinLossOverlay />)

    expect(
      screen.getByText(/No challenge active.*resets when a new stream starts/i),
    ).toBeInTheDocument()
    expect(screen.getByTestId('preview-window')).toHaveTextContent('12 W - 4 L · stream')
  })

  it('ends a challenge and returns the counter to per-stream mode', () => {
    render(<WinLossOverlay />)

    fireEvent.click(screen.getByRole('button', { name: 'End challenge' }))

    expect(updateStatsStartDate).toHaveBeenCalledWith(null)
    expect(updateStatsDays).toHaveBeenCalledWith(null)
  })

  it('adds a ranked win correction and immediately reloads the shared WL total', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<WinLossOverlay />)
    const initialRequests = socketState.socket.emit.mock.calls.filter(
      ([event]) => event === 'request-wl',
    ).length

    fireEvent.click(screen.getByRole('button', { name: 'Add ranked win' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/win-loss-adjustments', {
        body: JSON.stringify({ delta: 1, lobbyType: 7, won: true }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
    })
    await waitFor(() => {
      expect(
        socketState.socket.emit.mock.calls.filter(([event]) => event === 'request-wl'),
      ).toHaveLength(initialRequests + 1)
    })
  })

  it('subtracts several unranked losses without crossing zero', async () => {
    socketState.control.records = [{ lose: 5, type: 'U', win: 1 }]
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<WinLossOverlay />)

    fireEvent.click(screen.getByRole('radio', { name: 'Unranked' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Correction amount' }), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Remove unranked loss' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/win-loss-adjustments', {
        body: JSON.stringify({ delta: -3, lobbyType: 0, won: false }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
    })
  })

  it('disables a subtraction when its amount is larger than the selected total', () => {
    socketState.control.records = [{ lose: 2, type: 'R', win: 5 }]
    render(<WinLossOverlay />)

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Correction amount' }), {
      target: { value: '3' },
    })

    expect(screen.getByRole('button', { name: 'Remove ranked win' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Remove ranked loss' })).toBeDisabled()
  })

  it('does not allow a subtraction that would take the selected total below zero', () => {
    socketState.control.records = [{ lose: 0, type: 'R', win: 0 }]
    render(<WinLossOverlay />)

    expect(screen.getByRole('button', { name: 'Remove ranked win' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove ranked loss' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add ranked win' })).toBeEnabled()
  })
})
