import { render } from '@testing-library/react'
import type { App } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useStreamOfflineNotification } from '@/lib/hooks/useStreamOfflineNotification'

type Notification = ReturnType<typeof App.useApp>['notification']

function renderStreamOfflineNotification(
  streamOnline: boolean | undefined,
  notification: Notification,
  refreshSettings = vi.fn(),
) {
  const TestComponent = () => {
    useStreamOfflineNotification(streamOnline, notification, refreshSettings)
    return null
  }

  return { ...render(<TestComponent />), refreshSettings }
}

describe(useStreamOfflineNotification, () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens a persistent notification and periodically refreshes settings while offline', () => {
    vi.useFakeTimers()
    const notification = {
      destroy: vi.fn(),
      open: vi.fn(),
    } as unknown as Notification

    const { refreshSettings } = renderStreamOfflineNotification(false, notification)

    expect(notification.open).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 0,
        key: 'stream-offline',
        message: 'Twitch stream is offline',
        placement: 'bottomLeft',
        type: 'error',
      }),
    )
    expect(vi.getTimerCount()).toBe(1)

    vi.advanceTimersByTime(30_000)
    expect(refreshSettings).toHaveBeenCalledOnce()
  })

  it('stops refreshing and destroys the notification when settings say the stream is online', () => {
    vi.useFakeTimers()
    const notification = {
      destroy: vi.fn(),
      open: vi.fn(),
    } as unknown as Notification
    const refreshSettings = vi.fn()

    const { rerender } = renderStreamOfflineNotification(false, notification, refreshSettings)
    const TestComponent = () => {
      useStreamOfflineNotification(true, notification, refreshSettings)
      return null
    }

    rerender(<TestComponent />)
    vi.advanceTimersByTime(60_000)

    expect(notification.destroy).toHaveBeenCalledWith('stream-offline')
    expect(refreshSettings).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
