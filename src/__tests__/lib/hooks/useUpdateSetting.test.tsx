import { act, render } from '@testing-library/react'
import useSWR from 'swr'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
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

describe('useUpdate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    mutateMock.mockReset()
    messageOpenMock.mockReset()
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

    expect(global.fetch).toHaveBeenCalledWith('/api/settings/showRankImage', {
      body: JSON.stringify({ value: false }),
      method: 'PATCH',
    })
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
})
