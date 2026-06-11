import { describe, expect, it, vi } from 'vite-plus/test'
import {
  filterNav,
  findBestMatchingMenuItem,
  isExternalNavItem,
  navConfig,
  navItemToMenuItem,
} from '@/components/Dashboard/navigation'

// The nav module pulls in antd + next/link only for navItemToMenuItem's JSX label.
// Stub them so these pure-data/pure-function tests don't depend on real antd.
vi.mock('antd', () => ({ Tag: () => null }))
vi.mock('next/link', () => ({ default: () => null }))

describe('navConfig regions', () => {
  it('exposes a flat 7-item primary rail in IA order, each with name + href + icon', () => {
    expect(navConfig.primary.map((item) => item.href)).toEqual([
      '/dashboard',
      '/dashboard/features',
      '/dashboard/features/overlay',
      '/dashboard/features/chat',
      '/dashboard/commands',
      '/dashboard/notable-players',
      '/dashboard/features/advanced',
    ])

    for (const item of navConfig.primary) {
      expect(item.name).toBeTruthy()
      expect(item.href).toBeTruthy()
      expect(item.icon).toBeTruthy()
      expect(item.children).toBeUndefined()
    }
  })

  it('only Setup is hidden from impersonators in the primary rail', () => {
    const hidden = navConfig.primary.filter((item) => item.hideForImpersonator).map((i) => i.name)
    expect(hidden).toEqual(['Setup'])
  })

  it('bottom region holds Team access and the admin-only Admin accordion', () => {
    const [teamAccess, admin] = navConfig.bottom

    expect(teamAccess.href).toBe('/dashboard/managers')
    expect(teamAccess.hideForImpersonator).toBe(true)
    expect(teamAccess.children).toBeUndefined()

    expect(admin.name).toBe('Admin')
    expect(admin.adminOnly).toBe(true)
    expect(admin.hideForImpersonator).toBe(true)
    expect(admin.key).toBe('admin-menu')
    expect(admin.children?.map((c) => c.href)).toEqual([
      '/dashboard/admin',
      '/dashboard/admin/manage-channel',
      '/dashboard/admin/test-gift',
    ])
  })

  it('account region (avatar dropdown) gates Billing + Your data for impersonators only', () => {
    expect(navConfig.account.map((i) => i.name)).toEqual(['Billing', 'Gift Pro', 'Your data'])

    const gated = navConfig.account.filter((i) => i.hideForImpersonator).map((i) => i.name)
    expect(gated).toEqual(['Billing', 'Your data'])
  })

  it('help region lists resources and flags external links', () => {
    expect(navConfig.help.map((i) => i.name)).toEqual([
      'Help center',
      "What's New",
      'Discord',
      'GitHub',
      'Service status',
      'Blog',
    ])

    const external = navConfig.help.filter(isExternalNavItem).map((i) => i.name)
    expect(external).toEqual(['Discord', 'GitHub', 'Service status'])
  })
})

describe('filterNav', () => {
  it('drops the Admin accordion for non-admins', () => {
    const result = filterNav(navConfig.bottom, { isAdmin: false, isImpersonating: false })
    expect(result.map((i) => i.name)).toEqual(['Team access'])
  })

  it('keeps the Admin accordion for admins', () => {
    const result = filterNav(navConfig.bottom, { isAdmin: true, isImpersonating: false })
    expect(result.map((i) => i.name)).toEqual(['Team access', 'Admin'])
  })

  it('hides Setup / Team access / Billing / Your data for impersonators everywhere', () => {
    const opts = { isAdmin: true, isImpersonating: true }

    expect(filterNav(navConfig.primary, opts).some((i) => i.name === 'Setup')).toBe(false)
    expect(filterNav(navConfig.bottom, opts)).toEqual([]) // Team access + Admin both drop
    expect(filterNav(navConfig.account, opts).map((i) => i.name)).toEqual(['Gift Pro'])
  })
})

describe('findBestMatchingMenuItem', () => {
  it.each([
    ['/dashboard', { key: '/dashboard', parentKey: '' }],
    ['/dashboard/features', { key: '/dashboard/features', parentKey: '' }],
    // Exact match beats the /dashboard/features prefix.
    ['/dashboard/features/overlay', { key: '/dashboard/features/overlay', parentKey: '' }],
    ['/dashboard/managers', { key: '/dashboard/managers', parentKey: '' }],
    [
      '/dashboard/admin/manage-channel',
      { key: '/dashboard/admin/manage-channel', parentKey: 'admin-menu' },
    ],
    // Routes outside the sidebar must highlight nothing (not Setup).
    ['/dashboard/billing', { key: '', parentKey: '' }],
    ['/dashboard/data', { key: '', parentKey: '' }],
    ['/dashboard/help', { key: '', parentKey: '' }],
    ['/dashboard/unknown', { key: '', parentKey: '' }],
    // Unknown deep route walks up to the nearest registered prefix.
    ['/dashboard/features/overlay/extra', { key: '/dashboard/features/overlay', parentKey: '' }],
    ['/dashboard/commands/new', { key: '/dashboard/commands', parentKey: '' }],
  ] as const)('maps %s correctly', (pathname, expected) => {
    expect(findBestMatchingMenuItem(pathname)).toEqual(expected)
  })
})

describe('navItemToMenuItem', () => {
  it('keys items by href and carries an icon', () => {
    const item = navItemToMenuItem(navConfig.primary[0])
    expect(item).toMatchObject({ key: '/dashboard' })
    expect((item as { icon: unknown }).icon).toBeTruthy()
  })

  it('keys the Admin accordion by its stable key and maps children', () => {
    const admin = navConfig.bottom.find((i) => i.adminOnly)
    const item = navItemToMenuItem(admin as NonNullable<typeof admin>)
    expect(item).toMatchObject({ key: 'admin-menu' })
    expect((item as { children: unknown[] }).children).toHaveLength(3)
  })
})
