import { render } from '@testing-library/react'
import type { App } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStreamOfflineNotification } from '@/lib/hooks/useStreamOfflineNotification'

type Notification = ReturnType<typeof App.useApp>['notification']

function renderStreamOfflineNotification(
  streamOnline: boolean | undefined,
  notification: Notification,
) {
  const TestComponent = () => {
    useStreamOfflineNotification(streamOnline, notification)
    return null
  }

  return render(<TestComponent />)
}

describe('useStreamOfflineNotification', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens a persistent notification while the stream is offline without scheduling refreshes', () => {
    vi.useFakeTimers()
    const notification = {
      destroy: vi.fn(),
      open: vi.fn(),
    } as unknown as Notification

    renderStreamOfflineNotification(false, notification)

    expect(notification.open).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 0,
        key: 'stream-offline',
        message: 'Twitch stream is offline',
        placement: 'bottomLeft',
        type: 'error',
      }),
    )
    expect(vi.getTimerCount()).toBe(0)
  })

  it('destroys the offline notification when refreshed settings say the stream is online', () => {
    const notification = {
      destroy: vi.fn(),
      open: vi.fn(),
    } as unknown as Notification

    const { rerender } = renderStreamOfflineNotification(false, notification)
    const TestComponent = () => {
      useStreamOfflineNotification(true, notification)
      return null
    }

    rerender(<TestComponent />)

    expect(notification.destroy).toHaveBeenCalledWith('stream-offline')
  })
})
