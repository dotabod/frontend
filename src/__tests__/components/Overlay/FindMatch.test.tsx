import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FindMatch } from '@/components/Overlay/main/FindMatch'
import { Settings } from '@/lib/defaultSettings'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

vi.mock('@/components/Overlay/main/MatchTimer', () => ({
  MatchTimer: () => <div data-testid='match-timer' />,
}))

vi.mock('@/lib/hooks/useTransformRes', () => ({
  useTransformRes:
    () =>
    ({ h = 0, w = 0 }: { h?: number; w?: number }) =>
      h || w,
}))

vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  useUpdateSetting: (key?: string) => ({
    data: key === Settings.queueBlockerFindMatch ? true : undefined,
    original: { locale: 'ru-RU' },
  }),
}))

describe(FindMatch, () => {
  it('renders the active queue label in the streamer locale over the blank asset', () => {
    render(<FindMatch />)

    expect(screen.getByTestId('finding-match-label')).toHaveTextContent('Поиск игры')
    expect(screen.getByAltText('Finding Match')).toHaveAttribute(
      'src',
      '/images/overlay/finding-match.png',
    )
  })
})
