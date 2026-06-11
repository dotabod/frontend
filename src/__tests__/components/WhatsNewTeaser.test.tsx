import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('next/link', () => ({
  default: ({ children, href, ...p }: any) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}))

import WhatsNewTeaser from '@/components/Dashboard/WhatsNewTeaser'
import { whatsNew } from '@/lib/whatsNew'

describe('WhatsNewTeaser', () => {
  it("links to the What's New page and shows the newest feature title", () => {
    render(<WhatsNewTeaser />)

    expect(screen.getByText(/What's new in Dotabod/i)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(whatsNew[0].title))).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard/whats-new')
  })
})
