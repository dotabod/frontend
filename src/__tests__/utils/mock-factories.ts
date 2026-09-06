import type { Session } from 'next-auth'
import type { SessionContextValue } from 'next-auth/react'
import type { NextRouter } from 'next/router'
import type { SWRResponse } from 'swr'
import { vi } from 'vitest'

type AuthenticatedSession = Extract<SessionContextValue, { status: 'authenticated' }>
type StreamStatus = { stream_online: boolean }

export const createMockSession = function createMockSession(
  overrides?: Partial<Session>,
): AuthenticatedSession {
  const session = {
    expires: '1',
    user: {
      email: 'test@example.com',
      id: 'user-123',
      image: 'https://example.com/avatar.png',
      isImpersonating: false,
      locale: 'en',
      name: 'Test User',
      scope: '',
      twitchId: 'twitch-123',
    },
    ...overrides,
  } satisfies Session

  return {
    data: session,
    status: 'authenticated',
    update: vi.fn<(data?: unknown) => Promise<Session | null>>().mockResolvedValue(session),
  }
}

export const createMockRouter = function createMockRouter(
  overrides?: Partial<NextRouter>,
): NextRouter {
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
  } satisfies NextRouter
}

export const createMockSWR = function createMockSWR(
  overrides?: Partial<SWRResponse<StreamStatus, unknown>>,
): SWRResponse<StreamStatus, unknown> {
  return {
    data: { stream_online: false },
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
    ...overrides,
  } satisfies SWRResponse<StreamStatus, unknown>
}
