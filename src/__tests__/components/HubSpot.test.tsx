import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/script', () => ({
  default: ({ src, id }: { src?: string; id?: string }) => (
    <script data-testid='hs-script' id={id} src={src} />
  ),
}))
vi.mock('next/router', () => ({ useRouter: vi.fn() }))
vi.mock('next-auth/react', () => ({ useSession: vi.fn() }))

import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import HubSpot from '@/components/HubSpot'

// biome-ignore lint/suspicious/noExplicitAny: minimal stubs for test doubles
const anyVal = (v: unknown) => v as any

const widget = {
  load: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  refresh: vi.fn(),
  remove: vi.fn(),
}
const conversations = { widget, clear: vi.fn() }

describe('HubSpot component', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(anyVal({ pathname: '/dashboard' }))
    vi.mocked(useSession).mockReturnValue(anyVal({ data: null, status: 'unauthenticated' }))
    window._hsq = []
    window.hsConversationsOnReady = []
    window.hsConversationsSettings = undefined
    window.HubSpotConversations = anyVal(conversations)
    global.fetch = vi.fn()
  })

  it('renders nothing and never touches HubSpot on /overlay/[userId]', () => {
    vi.mocked(useRouter).mockReturnValue(anyVal({ pathname: '/overlay/[userId]' }))
    const { container } = render(<HubSpot />)
    expect(container).toBeEmptyDOMElement()
    expect(widget.load).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('does not load while the session is still loading', () => {
    vi.mocked(useSession).mockReturnValue(anyVal({ data: null, status: 'loading' }))
    render(<HubSpot />)
    expect(widget.load).not.toHaveBeenCalled()
  })

  it('loads the widget without identification for anonymous visitors', () => {
    render(<HubSpot />)
    expect(widget.load).toHaveBeenCalledTimes(1)
    expect(window.hsConversationsSettings).toEqual({ loadImmediately: false })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('sets identification before loading for an authenticated visitor', async () => {
    vi.mocked(useSession).mockReturnValue(
      anyVal({
        data: { user: { email: 'gamer@example.com', name: 'Cool Gamer' } },
        status: 'authenticated',
      }),
    )
    global.fetch = vi.fn().mockResolvedValue(
      anyVal({
        ok: true,
        status: 200,
        json: async () => ({ email: 'gamer@example.com', token: 'vtok' }),
      }),
    )

    render(<HubSpot />)

    await waitFor(() => expect(widget.load).toHaveBeenCalled())
    expect(window.hsConversationsSettings).toEqual({
      loadImmediately: false,
      identificationEmail: 'gamer@example.com',
      identificationToken: 'vtok',
    })
    expect(window._hsq).toContainEqual([
      'identify',
      { email: 'gamer@example.com', name: 'Cool Gamer' },
    ])
    expect(window._hsq).toContainEqual(['trackPageView'])
  })

  it('loads unidentified on a 204 response without parsing an empty body', async () => {
    vi.mocked(useSession).mockReturnValue(
      anyVal({
        data: { user: { email: 'gamer@example.com', name: 'Cool Gamer' } },
        status: 'authenticated',
      }),
    )
    const json = vi.fn()
    global.fetch = vi.fn().mockResolvedValue(anyVal({ ok: true, status: 204, json }))

    render(<HubSpot />)

    await waitFor(() => expect(widget.load).toHaveBeenCalled())
    expect(json).not.toHaveBeenCalled()
    expect(window.hsConversationsSettings).toEqual({ loadImmediately: false })
  })
})
