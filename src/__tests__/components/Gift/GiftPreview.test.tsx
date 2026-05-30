import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { GiftPreview } from '@/components/Gift/GiftSubscriptionForm/GiftPreview'

vi.mock('@/components/TwitchChat', () => ({
  default: ({ responses }: { responses: React.ReactNode[] }) => <div>{responses}</div>,
}))

vi.mock('@/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('GiftPreview', () => {
  it('shows the Twitch chat preview with sender and message', () => {
    render(<GiftPreview senderName='Tester' giftMessage='hello' />)

    expect(screen.getByText('How it lands in their chat')).toBeInTheDocument()
    expect(screen.getByText('Tester')).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})
