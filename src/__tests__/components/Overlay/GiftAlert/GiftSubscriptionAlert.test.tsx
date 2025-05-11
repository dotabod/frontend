import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GiftSubscriptionAlert from '../../../../components/Overlay/GiftAlert/GiftSubscriptionAlert'

describe('GiftSubscriptionAlert', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('renders correctly with required props', () => {
    render(<GiftSubscriptionAlert senderName='JohnDoe' giftType='monthly' giftQuantity={1} />)

    expect(screen.getByText('Gift Subscription Received!')).toBeInTheDocument()
    expect(screen.getByText('JohnDoe')).toBeInTheDocument()
    expect(screen.getByText('gifted you')).toBeInTheDocument()
    expect(screen.getByText('1 Month of Dotabod Pro')).toBeInTheDocument()
  })

  it('formats gift type correctly for different types', () => {
    // Test monthly gift
    const { rerender } = render(
      <GiftSubscriptionAlert senderName='JohnDoe' giftType='monthly' giftQuantity={3} />,
    )
    expect(screen.getByText('3 Months of Dotabod Pro')).toBeInTheDocument()

    // Test annual gift
    rerender(<GiftSubscriptionAlert senderName='JohnDoe' giftType='annual' giftQuantity={1} />)
    expect(screen.getByText('1 Year of Dotabod Pro')).toBeInTheDocument()

    // Test lifetime gift
    rerender(<GiftSubscriptionAlert senderName='JohnDoe' giftType='lifetime' giftQuantity={1} />)
    expect(screen.getByText('Lifetime of Dotabod Pro')).toBeInTheDocument()
  })

  it('displays gift message when provided', () => {
    render(
      <GiftSubscriptionAlert
        senderName='JohnDoe'
        giftType='monthly'
        giftQuantity={1}
        giftMessage='Enjoy your subscription!'
      />,
    )

    expect(screen.getByText('"Enjoy your subscription!"')).toBeInTheDocument()
  })

  it('calls onComplete callback after timeout', () => {
    const onCompleteMock = vi.fn()

    render(
      <GiftSubscriptionAlert
        senderName='JohnDoe'
        giftType='monthly'
        giftQuantity={1}
        onComplete={onCompleteMock}
      />,
    )

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Should not be called immediately (waiting for exit animation)
    expect(onCompleteMock).not.toHaveBeenCalled()

    // Fast-forward exit animation time
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now it should be called
    expect(onCompleteMock).toHaveBeenCalledTimes(1)
  })
})
