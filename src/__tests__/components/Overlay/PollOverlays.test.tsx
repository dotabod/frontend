import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PollOverlays } from '@/components/Overlay/PollOverlays'

vi.mock('@/components/Overlay/PollOverlay', () => ({
  PollOverlay: ({ endDate }: { endDate: string }) => (
    <div data-testid='poll-end-date'>{endDate}</div>
  ),
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
  it('passes ISO bet end dates through without coercing them to NaN', () => {
    const endDate = '2026-05-16T13:00:00.000Z'

    render(
      <PollOverlays
        pollData={null}
        betData={{
          title: 'Prediction',
          endDate,
          outcomes: [{ title: 'Radiant', totalVotes: 1, channelPoints: 10 }],
        }}
        radiantWinChance={null}
        setPollData={vi.fn()}
        setBetData={vi.fn()}
      />,
    )

    expect(screen.getByTestId('poll-end-date')).toHaveTextContent(endDate)
  })
})
