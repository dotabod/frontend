import { describe, expect, it, vi } from 'vitest'

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
  it('exposes a flat 8-item primary rail in IA order, each with name + href + icon', () => {
    expect(navConfig.primary.map((item) => item.href)).toStrictEqual([
      '/dashboard',
      '/dashboard/features',
      '/dashboard/features/overlay',
      '/dashboard/features/chat',
      '/dashboard/commands',
      '/dashboard/notable-players',
      '/dashboard/features/advanced',
      '/dashboard/whats-new',
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
    expect(hidden).toStrictEqual(['Setup'])
  })

  it('bottom region holds diagnostics, Team access, Help center, and the Admin accordion', () => {
    const [diagnostics, teamAccess, helpCenter, admin] = navConfig.bottom

    expect(diagnostics.href).toBe('/dashboard/diagnostics')
    expect(diagnostics.name).toBe('Diagnostics')

    expect(teamAccess.href).toBe('/dashboard/managers')
    expect(teamAccess.hideForImpersonator).toBeTruthy()
    expect(teamAccess.children).toBeUndefined()

    // Help center is pinned in the rail and visible to everyone (no impersonator gate).
    expect(helpCenter.href).toBe('/dashboard/help')
    expect(helpCenter.name).toBe('Help center')
    expect(helpCenter.hideForImpersonator).toBeUndefined()
    expect(helpCenter.adminOnly).toBeUndefined()

    expect(admin.name).toBe('Admin')
    expect(admin.adminOnly).toBeTruthy()
    expect(admin.hideForImpersonator).toBeTruthy()
    expect(admin.key).toBe('admin-menu')
    expect(admin.children?.map((c) => c.href)).toStrictEqual([
      '/dashboard/admin',
      '/dashboard/admin/manage-channel',
      '/dashboard/admin/test-gift',
    ])
  })

  it('account region (avatar dropdown) gates Billing + Your data for impersonators only', () => {
    expect(navConfig.account.map((i) => i.name)).toStrictEqual(['Billing', 'Gift Pro', 'Your data'])

    const gated = navConfig.account.filter((i) => i.hideForImpersonator).map((i) => i.name)
    expect(gated).toStrictEqual(['Billing', 'Your data'])
  })

  it('help region lists resources and flags external links', () => {
    expect(navConfig.help.map((i) => i.name)).toStrictEqual([
      'Help center',
      'Discord',
      'GitHub',
      'Service status',
      'Blog',
    ])

    const external = navConfig.help.filter(isExternalNavItem).map((i) => i.name)
    expect(external).toStrictEqual(['Discord', 'GitHub', 'Service status'])
  })
})

describe(filterNav, () => {
  it('drops the Admin accordion for non-admins', () => {
    const result = filterNav(navConfig.bottom, { isAdmin: false, isImpersonating: false })
    expect(result.map((i) => i.name)).toStrictEqual(['Diagnostics', 'Team access', 'Help center'])
  })

  it('keeps the Admin accordion for admins', () => {
    const result = filterNav(navConfig.bottom, { isAdmin: true, isImpersonating: false })
    expect(result.map((i) => i.name)).toStrictEqual([
      'Diagnostics',
      'Team access',
      'Help center',
      'Admin',
    ])
  })

  it('hides Setup / Team access / Billing / Your data for impersonators everywhere', () => {
    const opts = { isAdmin: true, isImpersonating: true }

    expect(filterNav(navConfig.primary, opts).some((i) => i.name === 'Setup')).toBeFalsy()
    // Team access + Admin both drop; diagnostics and Help center stay available.
    expect(filterNav(navConfig.bottom, opts).map((i) => i.name)).toStrictEqual([
      'Diagnostics',
      'Help center',
    ])
    expect(filterNav(navConfig.account, opts).map((i) => i.name)).toStrictEqual(['Gift Pro'])
  })
})

describe(findBestMatchingMenuItem, () => {
  it.each([
    ['/dashboard', { key: '/dashboard', parentKey: '' }],
    ['/dashboard/features', { key: '/dashboard/features', parentKey: '' }],
    // Exact match beats the /dashboard/features prefix.
    ['/dashboard/features/overlay', { key: '/dashboard/features/overlay', parentKey: '' }],
    ['/dashboard/managers', { key: '/dashboard/managers', parentKey: '' }],
    ['/dashboard/diagnostics', { key: '/dashboard/diagnostics', parentKey: '' }],
    [
      '/dashboard/admin/manage-channel',
      { key: '/dashboard/admin/manage-channel', parentKey: 'admin-menu' },
    ],
    // Routes outside the sidebar must highlight nothing (not Setup).
    ['/dashboard/billing', { key: '', parentKey: '' }],
    ['/dashboard/data', { key: '', parentKey: '' }],
    ['/dashboard/unknown', { key: '', parentKey: '' }],
    // Help center now lives in the sidebar, so its route highlights it.
    ['/dashboard/help', { key: '/dashboard/help', parentKey: '' }],
    // Unknown deep route walks up to the nearest registered prefix.
    ['/dashboard/features/overlay/extra', { key: '/dashboard/features/overlay', parentKey: '' }],
    ['/dashboard/commands/new', { key: '/dashboard/commands', parentKey: '' }],
  ] as const)('maps %s correctly', (pathname, expected) => {
    expect(findBestMatchingMenuItem(pathname)).toStrictEqual(expected)
  })
})

describe(navItemToMenuItem, () => {
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
