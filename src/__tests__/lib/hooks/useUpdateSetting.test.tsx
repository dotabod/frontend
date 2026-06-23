import { act, render, waitFor } from '@testing-library/react'
import * as Sentry from '@sentry/nextjs'
import useSWR from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useUpdate, useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

const mutateMock = vi.hoisted(() => vi.fn())
const messageOpenMock = vi.hoisted(() => vi.fn())

vi.mock('next/router', () => ({
  useRouter: () => ({ isReady: true, pathname: '/dashboard', query: {} }),
}))

vi.mock('antd', () => ({
  App: {
    useApp: () => ({
      message: {
        open: messageOpenMock,
      },
    }),
  },
}))

vi.mock('swr', () => ({
  default: vi.fn(),
  useSWRConfig: () => ({
    mutate: mutateMock,
  }),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// useUpdateSetting gates writes on tier access via useSubscription; stub it. smokeActivated is
// a FREE chatter, so access is granted regardless of the value returned here.
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ subscription: null }),
}))

describe('useUpdate', () => {
  beforeEach(() => {
    mutateMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mutateMock.mockReset()
    messageOpenMock.mockReset()
    vi.mocked(Sentry.captureException).mockReset()
  })

  it('patches custom setting endpoints while mutating the main settings cache', () => {
    const updateRef: {
      current?: ReturnType<
        typeof useUpdate<Record<string, unknown>, { value: boolean }>
      >['updateSetting']
    } = {}

    vi.mocked(useSWR).mockReturnValue({
      data: { settings: [{ key: 'showRankImage', value: true }] },
      error: undefined,
    } as ReturnType<typeof useSWR>)

    global.fetch = vi.fn().mockResolvedValue({ ok: true })

    function TestComponent() {
      const { updateSetting } = useUpdate<Record<string, unknown>, { value: boolean }>({
        dataTransform: (data, newValue) => ({
          ...data,
          settings: [{ key: 'showRankImage', value: newValue.value }],
        }),
        path: '/api/settings',
      })
      updateRef.current = updateSetting
      return null
    }

    render(<TestComponent />)

    act(() => {
      updateRef.current?.({ value: false }, '/api/settings/showRankImage')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/settings/showRankImage',
      expect.objectContaining({
        body: JSON.stringify({ value: false }),
        method: 'PATCH',
        signal: expect.any(AbortSignal),
      }),
    )
    expect(mutateMock).toHaveBeenCalledWith(
      '/api/settings',
      expect.any(Promise),
      expect.objectContaining({
        optimisticData: {
          settings: [{ key: 'showRankImage', value: false }],
        },
      }),
    )
  })

  it('toggles isSaving while a mutation is in flight', async () => {
    const refs: {
      updateSetting?: ReturnType<
        typeof useUpdate<Record<string, unknown>, { value: boolean }>
      >['updateSetting']
      isSaving?: boolean
    } = {}
    const savingHistory: boolean[] = []

    vi.mocked(useSWR).mockReturnValue({
      data: { settings: [] },
      error: undefined,
    } as ReturnType<typeof useSWR>)

    let resolveFetch: ((value: Response) => void) | undefined
    global.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        }),
    )

    // SWR's mutate awaits the updateFn promise; we mimic that so the finally block runs.
    mutateMock.mockImplementation(async (_path, promise) => {
      await promise
    })

    function TestComponent() {
      const result = useUpdate<Record<string, unknown>, { value: boolean }>({
        dataTransform: (data, newValue) => ({ ...data, value: newValue.value }),
        path: '/api/settings',
      })
      refs.updateSetting = result.updateSetting
      refs.isSaving = result.isSaving
      savingHistory.push(result.isSaving)
      return null
    }

    render(<TestComponent />)

    expect(refs.isSaving).toBe(false)

    act(() => {
      refs.updateSetting?.({ value: true }, '/api/settings/bets')
    })

    await waitFor(() => {
      expect(refs.isSaving).toBe(true)
    })

    await act(async () => {
      resolveFetch?.({ ok: true } as Response)
    })

    await waitFor(() => {
      expect(refs.isSaving).toBe(false)
    })

    expect(savingHistory).toContain(true)
  })

  it('reports failed mutations to Sentry and shows a status-aware toast', async () => {
    const updateRef: {
      current?: ReturnType<
        typeof useUpdate<Record<string, unknown>, { value: boolean }>
      >['updateSetting']
    } = {}

    vi.mocked(useSWR).mockReturnValue({
      data: { settings: [] },
      error: undefined,
    } as ReturnType<typeof useSWR>)

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response)

    let updatePromise: Promise<unknown> | undefined
    mutateMock.mockImplementation(async (_path, promise) => {
      updatePromise = promise
      await promise.catch(() => {})
    })

    function TestComponent() {
      const { updateSetting } = useUpdate<Record<string, unknown>, { value: boolean }>({
        dataTransform: (data, newValue) => ({ ...data, value: newValue.value }),
        path: '/api/settings',
      })
      updateRef.current = updateSetting
      return null
    }

    render(<TestComponent />)

    act(() => {
      updateRef.current?.({ value: true }, '/api/settings/bets')
    })

    await act(async () => {
      await updatePromise?.catch(() => {})
    })

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ feature: 'settings-mutation' }),
        extra: expect.objectContaining({ status: 403, path: '/api/settings/bets' }),
      }),
    )
    expect(messageOpenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        content: expect.stringContaining('permission'),
      }),
    )
  })
})

describe('useUpdateSetting (chatters)', () => {
  beforeEach(() => {
    mutateMock.mockResolvedValue(undefined)
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mutateMock.mockReset()
    messageOpenMock.mockReset()
  })

  it('optimistically flips the toggled chatter so the switch reflects the new state', () => {
    const refs: { updateSetting?: (value: boolean | null) => void; value?: unknown } = {}

    vi.mocked(useSWR).mockReturnValue({
      data: {
        settings: [
          {
            key: 'chatters',
            value: { smoke: { enabled: true }, smokeActivated: { enabled: false } },
          },
        ],
      },
      error: undefined,
    } as ReturnType<typeof useSWR>)

    function TestComponent() {
      const { data, updateSetting } = useUpdateSetting<boolean | null>('chatters.smokeActivated')
      refs.updateSetting = updateSetting
      refs.value = data
      return null
    }

    render(<TestComponent />)

    // Sanity: the switch starts in the stored (disabled) state.
    expect(refs.value).toBe(false)

    act(() => {
      refs.updateSetting?.(true)
    })

    // The PATCH targets the parent `chatters` key with the nested {enabled} shape.
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/settings/chatters',
      expect.objectContaining({
        body: JSON.stringify({ value: { smokeActivated: { enabled: true } } }),
        method: 'PATCH',
      }),
    )

    // Regression: with revalidate off, the optimistic cache update is the only thing the UI
    // reads, so it must flip smokeActivated to enabled (leaving other chatters intact) rather
    // than stashing the payload under a stray `value` key.
    expect(mutateMock).toHaveBeenCalledWith(
      '/api/settings',
      expect.any(Promise),
      expect.objectContaining({
        optimisticData: {
          settings: [
            {
              key: 'chatters',
              value: { smoke: { enabled: true }, smokeActivated: { enabled: true } },
            },
          ],
        },
      }),
    )
  })
})
