import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))
vi.mock('@/ui/card', () => ({
  Card: ({ title, children }: any) => (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))
vi.mock('@/components/Dashboard/Features/TierSwitch', () => ({
  TierSwitch: ({ label }: any) => <span>{label}</span>,
}))

import NewFeaturesCard from '@/components/Dashboard/Features/NewFeaturesCard'

describe('NewFeaturesCard', () => {
  it("renders the master toggle and links to What's New", () => {
    render(<NewFeaturesCard />)

    expect(screen.getByText('New features')).toBeInTheDocument()
    expect(screen.getByText(/Automatically enable new features/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /See what's new/ })).toHaveAttribute(
      'href',
      '/dashboard/whats-new',
    )
  })
})
