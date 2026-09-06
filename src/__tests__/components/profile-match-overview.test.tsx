import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProfileMatchOverview } from '@/components/profile-match-overview'

describe(ProfileMatchOverview, () => {
  it('renders same-origin profile links for a valid username', () => {
    render(<ProfileMatchOverview heroPerformance={[]} recentMatches={[]} username='dotabod' />)

    expect(screen.getByRole('link', { name: 'View all hero win rates' })).toHaveAttribute(
      'href',
      '/dotabod/matches?view=heroes',
    )
    expect(screen.getByRole('link', { name: 'View all matches' })).toHaveAttribute(
      'href',
      '/dotabod/matches',
    )
  })

  it('does not render attacker-controlled profile links for an invalid username', () => {
    render(
      <ProfileMatchOverview
        heroPerformance={[]}
        recentMatches={[]}
        username='//attacker.example'
      />,
    )

    expect(screen.getByRole('link', { name: 'View all hero win rates' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(screen.getByRole('link', { name: 'View all matches' })).toHaveAttribute('href', '/')
  })
})
