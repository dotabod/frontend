import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatBot from '@/components/Dashboard/ChatBot'

const useSWRMock = vi.fn()
const useFeatureAccessMock = vi.fn()
const routerReplaceMock = vi.fn()

vi.mock('next/image', () => ({
  default: ({ alt, src, ...props }: { alt: string; src: string }) => (
    <img alt={alt} src={src} {...props} />
  ),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/dashboard',
    query: {},
    replace: routerReplaceMock,
  }),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-123',
        twitchId: 'twitch-123',
      },
    },
  }),
}))

vi.mock('swr', () => ({
  default: (...args: unknown[]) => useSWRMock(...args),
}))

vi.mock('antd', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => <div>{message}</div>,
  Button: ({
    children,
    href,
    onClick,
    type,
  }: React.PropsWithChildren<{ href?: string; onClick?: () => void; type?: string }>) => (
    <button data-type={type} onClick={onClick} type='button'>
      {href ? <span>{href}</span> : null}
      {children}
    </button>
  ),
  List: ({
    dataSource,
    renderItem,
  }: {
    dataSource: Array<unknown>
    renderItem: (item: any) => React.ReactNode
  }) => (
    <div>
      {dataSource.map((item, index) => (
        <div key={index}>{renderItem(item)}</div>
      ))}
    </div>
  ),
  Spin: () => <span>Loading…</span>,
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

vi.mock('@/hooks/useSubscription', () => ({
  useFeatureAccess: (feature: string) => useFeatureAccessMock(feature),
}))

vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  STABLE_SWR_OPTIONS: {},
  useUpdateAccount: () => ({
    data: {
      accounts: [{ mmr: 6200 }],
    },
  }),
  useUpdateSetting: () => ({
    data: 6200,
  }),
}))

vi.mock('@/lib/track', () => ({
  useTrack: () => vi.fn(),
}))

vi.mock('@/pages/dashboard/help', () => ({
  StepComponent: ({ steps }: { steps: React.ReactNode[] }) => (
    <div>
      {steps.map((step, index) => (
        <div key={index}>{step}</div>
      ))}
    </div>
  ),
}))

vi.mock('@/ui/card', () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('@/components/Dashboard/Features/MmrForm', () => ({
  default: () => <div>MMR Form</div>,
}))

function mock7TvFetchResponse({
  hasEditor = false,
  hasEmotes = false,
  hasUser = false,
}: {
  hasEditor?: boolean
  hasEmotes?: boolean
  hasUser?: boolean
}) {
  global.fetch = vi.fn().mockResolvedValue(
    createFetchResponse(
      hasUser
        ? {
            user: {
              id: '7tv-user',
              editors: hasEditor ? [{ id: '01GQZ0CEDR000AH5YBCSXQWR0V' }] : [],
            },
            emote_set: {
              id: 'set-1',
              emotes: hasEmotes
                ? [
                    { name: 'HECANT' },
                    { name: 'Okayeg' },
                    { name: 'Happi' },
                    { name: 'Madge' },
                    { name: 'POGGIES' },
                    { name: 'PepeLaugh' },
                    { name: 'ICANT' },
                    { name: 'BASED' },
                    { name: 'Chatting' },
                    { name: 'massivePIDAS' },
                    { name: 'Sadge' },
                    { name: 'EZ' },
                    { name: 'Clap' },
                    { name: 'peepoGamble' },
                    { name: 'PauseChamp' },
                  ]
                : [],
            },
          }
        : {},
    ),
  )
}

describe('ChatBot setup UX', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    routerReplaceMock.mockReset()
    useSWRMock.mockReset()
    useFeatureAccessMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows automatic as a Pro preview for free users without implying setup is complete', async () => {
    mock7TvFetchResponse({ hasUser: false })

    useFeatureAccessMock.mockImplementation((feature: string) => ({
      hasAccess: false,
      requiredTier: feature === 'autoModerator' || feature === 'auto7TV' ? 'PRO' : 'FREE',
    }))

    useSWRMock.mockImplementation((key: string | null) => {
      if (key === '/api/make-dotabod-mod') {
        return {
          data: {
            status: 'FORBIDDEN',
            message: 'Automatic moderator setup is part of Dotabod Pro',
          },
          error: undefined,
          isLoading: false,
        }
      }

      return {
        data: undefined,
        error: undefined,
        isLoading: false,
      }
    })

    render(<ChatBot />)

    await waitFor(() => {
      expect(screen.getAllByText('Automatic setup').length).toBeGreaterThan(0)
    })

    expect(screen.getAllByText('Manual setup').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Automatic setup is available on Pro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('See Pro plans').length).toBeGreaterThan(0)
    expect(screen.queryByText('Moderator access confirmed')).not.toBeInTheDocument()
  })

  it('keeps the manual path one click away for free users', async () => {
    mock7TvFetchResponse({ hasUser: false })

    useFeatureAccessMock.mockImplementation(() => ({
      hasAccess: false,
      requiredTier: 'PRO',
    }))

    useSWRMock.mockImplementation((key: string | null) => {
      if (key === '/api/make-dotabod-mod') {
        return {
          data: { status: 'FORBIDDEN' },
          error: undefined,
          isLoading: false,
        }
      }

      return {
        data: undefined,
        error: undefined,
        isLoading: false,
      }
    })

    render(<ChatBot />)

    fireEvent.click(screen.getAllByRole('button', { name: /manual setup/i })[0])

    await waitFor(() => {
      expect(screen.getByText('Type the command: /mod dotabod')).toBeInTheDocument()
    })
  })

  it('falls back to manual 7TV setup when automatic install errors on Pro', async () => {
    mock7TvFetchResponse({ hasUser: true, hasEditor: true, hasEmotes: false })

    useFeatureAccessMock.mockImplementation(() => ({
      hasAccess: true,
      requiredTier: 'PRO',
    }))

    useSWRMock.mockImplementation((key: string | null) => {
      if (key === '/api/make-dotabod-mod') {
        return {
          data: { status: 'OK' },
          error: undefined,
          isLoading: false,
        }
      }

      if (key === '/api/update-emote-set') {
        return {
          data: undefined,
          error: Object.assign(new Error('failed'), { status: 500 }),
          isLoading: false,
        }
      }

      return {
        data: undefined,
        error: undefined,
        isLoading: false,
      }
    })

    render(<ChatBot />)

    await waitFor(() => {
      expect(screen.getByText('To add the required emotes manually:')).toBeInTheDocument()
    })
  })
})
