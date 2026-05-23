import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { PollOverlays } from '@/components/Overlay/PollOverlays'

const pollOverlayMock = vi.hoisted(() => ({
  lastOnComplete: null as null | (() => void),
}))

vi.mock('@/components/Overlay/PollOverlay', () => ({
  PollOverlay: ({ endDate, onComplete }: { endDate: string; onComplete: () => void }) => {
    pollOverlayMock.lastOnComplete = onComplete
    return <div data-testid='poll-end-date'>{endDate}</div>
  },
}))

vi.mock('@/components/Overlay/WinProbability', () => ({
  WinProbability: () => null,
}))

vi.mock('@/lib/hooks/useTransformRes', () => ({
  useTransformRes: () => (params: Record<string, number>) => params.w || params.h,
}))

vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  useUpdateSetting: () => ({ data: true }),
}))

describe('PollOverlays', () => {
  beforeEach(() => {
    pollOverlayMock.lastOnComplete = null
  })

  it('passes ISO bet end dates through without coercing them to NaN', () => {
    const endDate = '2026-05-16T13:00:00.000Z'

    render(
      <PollOverlays
        pollData={null}
        betData={{
          endDate,
          outcomes: [{ channelPoints: 10, title: 'Radiant', totalVotes: 1 }],
          title: 'Prediction',
        }}
        radiantWinChance={null}
        setPollData={vi.fn()}
        setBetData={vi.fn()}
      />,
    )

    expect(screen.getByTestId('poll-end-date')).toHaveTextContent(endDate)
  })

  describe('lifetime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-23T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('keeps the overlay mounted past 30s when the bet endDate is further in the future', () => {
      const setBetData = vi.fn()
      const endDate = new Date('2026-05-23T12:05:00.000Z').toISOString() // 5 min out

      render(
        <PollOverlays
          pollData={null}
          betData={{
            endDate,
            outcomes: [{ channelPoints: 10, title: 'Radiant', totalVotes: 1 }],
            title: 'Will we win with Pudge?',
          }}
          radiantWinChance={null}
          setPollData={vi.fn()}
          setBetData={setBetData}
        />,
      )

      act(() => {
        vi.advanceTimersByTime(35_000)
      })

      expect(screen.queryByTestId('poll-end-date')).not.toBeNull()
      expect(setBetData).not.toHaveBeenCalledWith(null)
    })

    it('stays mounted across streamed progress updates over the bet lifetime', () => {
      const setBetData = vi.fn()
      const endDate = new Date('2026-05-23T12:05:00.000Z').toISOString()
      const baseProps = {
        pollData: null,
        radiantWinChance: null,
        setPollData: vi.fn(),
        setBetData,
      }

      const { rerender } = render(
        <PollOverlays
          {...baseProps}
          betData={{
            endDate,
            outcomes: [{ channelPoints: 10, title: 'Radiant', totalVotes: 1 }],
            title: 'Will we win with Pudge?',
          }}
        />,
      )

      act(() => {
        vi.advanceTimersByTime(20_000)
      })

      rerender(
        <PollOverlays
          {...baseProps}
          betData={{
            endDate,
            outcomes: [{ channelPoints: 50, title: 'Radiant', totalVotes: 5 }],
            title: 'Will we win with Pudge?',
          }}
        />,
      )

      act(() => {
        vi.advanceTimersByTime(20_000)
      })

      rerender(
        <PollOverlays
          {...baseProps}
          betData={{
            endDate,
            outcomes: [{ channelPoints: 90, title: 'Radiant', totalVotes: 9 }],
            title: 'Will we win with Pudge?',
          }}
        />,
      )

      act(() => {
        vi.advanceTimersByTime(20_000)
      })

      expect(screen.queryByTestId('poll-end-date')).not.toBeNull()
      expect(setBetData).not.toHaveBeenCalledWith(null)
    })

    it('clears betData when PollOverlay reports onComplete', () => {
      const setBetData = vi.fn()
      const endDate = new Date('2026-05-23T12:01:00.000Z').toISOString()

      render(
        <PollOverlays
          pollData={null}
          betData={{
            endDate,
            outcomes: [{ channelPoints: 10, title: 'Radiant', totalVotes: 1 }],
            title: 'Will we win with Pudge?',
          }}
          radiantWinChance={null}
          setPollData={vi.fn()}
          setBetData={setBetData}
        />,
      )

      expect(pollOverlayMock.lastOnComplete).toBeTypeOf('function')

      act(() => {
        pollOverlayMock.lastOnComplete?.()
      })

      expect(setBetData).toHaveBeenCalledWith(null)
    })
  })
})
