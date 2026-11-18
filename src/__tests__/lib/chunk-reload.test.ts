import { beforeEach, describe, expect, it, vi } from 'vitest'

import { reloadAfterChunkError } from '@/lib/chunk-reload'

const page = () => ({ reload: vi.fn<() => void>() })

describe(reloadAfterChunkError, () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('reloads a page whose chunk failed to load', () => {
    const current = page()

    reloadAfterChunkError(current, sessionStorage, 1_000_000)

    expect(current.reload).toHaveBeenCalledOnce()
  })

  it('does not reload again within a minute', () => {
    const current = page()

    reloadAfterChunkError(current, sessionStorage, 1_000_000)
    reloadAfterChunkError(current, sessionStorage, 1_030_000)

    expect(current.reload).toHaveBeenCalledOnce()
  })

  it('reloads again once a minute has passed', () => {
    const current = page()

    reloadAfterChunkError(current, sessionStorage, 1_000_000)
    reloadAfterChunkError(current, sessionStorage, 1_060_000)

    expect(current.reload).toHaveBeenCalledTimes(2)
  })
})
