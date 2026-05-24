import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/db'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'

const ctx = { req: {}, res: {} } as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireDashboardAccess', () => {
  it('redirects to /error?error=ACCOUNT_BANNED when users.bannedAt is set', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-banned', role: 'user' },
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ bannedAt: new Date() } as any)

    const result = (await requireDashboardAccess()(ctx)) as { redirect: { destination: string } }

    expect(result.redirect.destination).toBe('/error?error=ACCOUNT_BANNED')
  })

  it('passes through when bannedAt is null', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-ok', role: 'user' },
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ bannedAt: null } as any)

    const result = (await requireDashboardAccess()(ctx)) as { props: Record<string, unknown> }

    expect(result.props).toEqual({})
  })

  it('redirects to /login when there is no session (skips ban check entirely)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const result = (await requireDashboardAccess()(ctx)) as { redirect: { destination: string } }

    expect(result.redirect.destination).toBe('/login')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })
})
