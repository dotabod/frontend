import { GiftPreview } from '@/components/Gift/GiftSubscriptionForm/GiftPreview'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/Overlay/GiftAlert/GiftSubscriptionAlert', () => ({
  default: ({ senderName }: { senderName: string }) => <div>Alert {senderName}</div>,
}))

vi.mock('@/components/TwitchChat', () => ({
  default: ({ responses }: { responses: React.ReactNode[] }) => (
    <div>{responses}</div>
  ),
}))

describe('GiftPreview', () => {
  it('shows chat and overlay preview', () => {
    render(<GiftPreview senderName='Tester' giftMessage='hello' quantity={1} />)

    expect(screen.getByText('Gift Subscription Preview')).toBeInTheDocument()
    expect(screen.getByText('Alert Tester')).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})
