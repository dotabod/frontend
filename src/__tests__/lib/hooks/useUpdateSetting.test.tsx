import { act, render, waitFor } from '@testing-library/react'
import * as Sentry from '@sentry/nextjs'
import useSWR from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useUpdate } from '@/lib/hooks/useUpdateSetting'

const mutateMock = vi.hoisted(() => vi.fn())
const messageOpenMock = vi.hoisted(() => vi.fn())

vi.mock('next/router', () => ({
  useRouter: () => ({ isReady: true }),
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
