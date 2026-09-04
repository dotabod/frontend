import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import WinLossOverlay from '@/components/Overlay/WinLossOverlay'

const updateStatsDays = vi.hoisted(() => vi.fn())
const settingsState = vi.hoisted<{ statsDays: number | null }>(() => ({ statsDays: 7 }))

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
  default: ({ wl }: { wl: { statsDays: number | null } }) => (
    <div data-testid='preview-window'>{wl.statsDays === null ? 'stream' : wl.statsDays}</div>
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
    expect(screen.getByTestId('preview-window')).toHaveTextContent('30')
    expect(screen.getByText(/Last 30 days.*keeps counting across streams/i)).toBeInTheDocument()
    expect(screen.getByText(/!today always shows today's stats/i)).toBeInTheDocument()
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
    expect(screen.getByTestId('preview-window')).toHaveTextContent('stream')
  })

  it('clears a rolling counter back to per-stream mode without saving a queued day value', () => {
    vi.useFakeTimers()
    render(<WinLossOverlay />)

    const input = screen.getByRole('spinbutton', { name: 'Stats window' })
    fireEvent.change(input, { target: { value: '30' } })
    fireEvent.change(input, { target: { value: '' } })

    expect(updateStatsDays).toHaveBeenCalledWith(null)
    expect(input).toHaveValue('')
    expect(screen.getByTestId('preview-window')).toHaveTextContent('stream')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(updateStatsDays).toHaveBeenCalledTimes(1)
  })
})
