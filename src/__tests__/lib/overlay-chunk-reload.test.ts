import { beforeEach, describe, expect, it, vi } from 'vitest'

import { reloadOverlayAfterChunkError } from '@/lib/overlay-chunk-reload'

const pageAt = (pathname: string) => ({ pathname, reload: vi.fn<() => void>() })

describe(reloadOverlayAfterChunkError, () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('reloads an overlay whose chunk failed to load', () => {
    const page = pageAt('/overlay/user-1')

    reloadOverlayAfterChunkError(page, sessionStorage, 1_000_000)

    expect(page.reload).toHaveBeenCalledOnce()
  })

  it('does not reload again within a minute', () => {
    const page = pageAt('/overlay/user-1')

    reloadOverlayAfterChunkError(page, sessionStorage, 1_000_000)
    reloadOverlayAfterChunkError(page, sessionStorage, 1_030_000)

    expect(page.reload).toHaveBeenCalledOnce()
  })

  it('reloads again once a minute has passed', () => {
    const page = pageAt('/overlay/user-1')

    reloadOverlayAfterChunkError(page, sessionStorage, 1_000_000)
    reloadOverlayAfterChunkError(page, sessionStorage, 1_060_000)

    expect(page.reload).toHaveBeenCalledTimes(2)
  })

  // Someone may be typing on the dashboard, so only the unattended overlay reloads itself.
  it('leaves other pages alone', () => {
    const page = pageAt('/dashboard')

    reloadOverlayAfterChunkError(page, sessionStorage, 1_000_000)

    expect(page.reload).not.toHaveBeenCalled()
  })
})
