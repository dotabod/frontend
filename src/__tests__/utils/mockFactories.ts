// @ts-nocheck
import type { UseRouterResult } from 'next/router'
import type { Session } from 'next-auth'
import type { SWRResponse } from 'swr'

interface MockSessionData {
  user: {
    name: string
    email: string
    id: string
    image: string
  }
  expires: string
  status: 'authenticated' | 'unauthenticated' | 'loading'
  update: ReturnType<typeof vi.fn>
}

interface MockRouterData {
  query: Record<string, string>
  pathname: string
  replace: ReturnType<typeof vi.fn>
  push: ReturnType<typeof vi.fn>
  reload: ReturnType<typeof vi.fn>
  back: ReturnType<typeof vi.fn>
  prefetch: ReturnType<typeof vi.fn>
  beforePopState: ReturnType<typeof vi.fn>
  events: {
    on: ReturnType<typeof vi.fn>
    off: ReturnType<typeof vi.fn>
    emit: ReturnType<typeof vi.fn>
  }
  isFallback: boolean
  isReady: boolean
  isPreview: boolean
  asPath: string
  basePath: string
  isLocaleDomain: boolean
  route: string
  forward: ReturnType<typeof vi.fn>
}

interface MockSWRData<T = unknown> {
  data: T
  error: unknown
  isLoading: boolean
  isValidating: boolean
  mutate: ReturnType<typeof vi.fn>
}

export function createMockSession(
  overrides?: Partial<MockSessionData>,
): Session & { status: 'authenticated'; update: ReturnType<typeof vi.fn> } {
  return {
    data: {
      expires: '1',
      status: 'authenticated',
      update: vi.fn(),
      user: {
        email: 'test@example.com',
        id: 'user-123',
        image: 'https://example.com/avatar.png',
        name: 'Test User',
      },
      ...overrides,
    },
  } as unknown as Session & { status: 'authenticated'; update: ReturnType<typeof vi.fn> }
}

export function createMockRouter(overrides?: Partial<MockRouterData>): UseRouterResult {
  return {
    asPath: '',
    back: vi.fn(),
    basePath: '',
    beforePopState: vi.fn(),
    events: {
      emit: vi.fn(),
      off: vi.fn(),
      on: vi.fn(),
    },
    forward: vi.fn(),
    isFallback: false,
    isLocaleDomain: false,
    isPreview: false,
    isReady: true,
    pathname: '/dashboard',
    prefetch: vi.fn(),
    push: vi.fn(),
    query: {},
    reload: vi.fn(),
    replace: vi.fn(),
    route: '',
    ...overrides,
  } as unknown as UseRouterResult
}

export function createMockSWR<T = { stream_online: boolean }>(
  overrides?: Partial<MockSWRData<T>>,
): SWRResponse<T, unknown> {
  return {
    data: { stream_online: false } as T,
    error: null,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
    ...overrides,
  } as unknown as SWRResponse<T, unknown>
}
