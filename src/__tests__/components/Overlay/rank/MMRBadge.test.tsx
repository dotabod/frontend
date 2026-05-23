import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { MMRBadge } from '@/components/Overlay/rank/MMRBadge'

vi.mock('@/lib/hooks/useTransformRes', () => ({
  useTransformRes: () => (params: Record<string, number>) => params.w || params.h,
}))

describe('MMRBadge', () => {
  it('does not substitute the uncalibrated medal when rank images are hidden', () => {
    render(<MMRBadge image={undefined} leaderboard={189} rank={undefined} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('#189')).toBeInTheDocument()
  })
})
