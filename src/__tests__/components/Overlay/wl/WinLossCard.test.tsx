import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import WinLossCard from '@/components/Overlay/wl/WinLossCard'

vi.mock('@/lib/hooks/useTransformRes', () => ({
  useTransformRes: () => (params: Record<string, number>) => params.h,
}))

vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  useUpdateSetting: () => ({ data: true }),
}))

describe('WinLossCard', () => {
  it('shows the stats window once beside ranked and unranked records', () => {
    render(
      <WinLossCard
        wl={{
          records: [
            { lose: 5, type: 'R', win: 10 },
            { lose: 2, type: 'U', win: 3 },
          ],
          statsDays: 30,
        }}
      />,
    )

    expect(screen.getAllByText('30D')).toHaveLength(1)
    expect(screen.getByLabelText('Last 30 days')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()
    expect(screen.getByText('U')).toBeInTheDocument()
  })

  it('labels the default counter as this stream', () => {
    render(
      <WinLossCard
        wl={{
          records: [{ lose: 5, type: 'U', win: 10 }],
          statsDays: null,
        }}
      />,
    )

    expect(screen.getByLabelText('This stream')).toBeInTheDocument()
    expect(screen.getByText('STREAM')).toBeInTheDocument()
  })
})
