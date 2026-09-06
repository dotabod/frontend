import { BeakerIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { Tag } from 'antd'
import type { MenuProps } from 'antd'
import {
  DollarSignIcon,
  Gift,
  Github,
  HardDriveIcon,
  Info,
  LayoutDashboard,
  MessagesSquare,
  MonitorPlay,
  Activity,
  NewspaperIcon,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SquareTerminal,
  Star,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import type React from 'react'

import Discord from '@/images/logos/discord'

export type NavIcon = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

export interface NavItem {
  name: string
  href?: string
  /** Stable key used for menu selection when there is no href (Admin accordion). */
  key?: string
  icon?: NavIcon
  /** Renders a green "New" tag next to the label. */
  new?: boolean
  /** Opens in a new tab. Defaults to `href.startsWith('http')` when omitted. */
  external?: boolean
  hideForImpersonator?: boolean
  /** Only visible to `role === 'admin'`. */
  adminOnly?: boolean
  onClick?: () => void
  /** Only used by the Admin accordion now — the rest of the nav is flat. */
  children?: NavItem[]
}

export interface NavConfig {
  /** Flat, directly-clickable product rail (no accordion). */
  primary: NavItem[]
  /** Bottom-pinned utilities (Team access + Admin accordion). */
  bottom: NavItem[]
  /** Avatar dropdown entries injected between Dashboard and Logout. */
  account: NavItem[]
  /** "?" popover entries (help + external resources). */
  help: NavItem[]
}

// Shared so Help center lives in BOTH the sidebar bottom rail and the "?" popover
// without the href/label/icon drifting apart. (The ⌘K palette dedupes by href.)
const HELP_CENTER: NavItem = {
  href: '/dashboard/help',
  icon: QuestionMarkCircleIcon,
  name: 'Help center',
}

// Single source of truth feeding the sidebar, avatar menu, "?" menu and ⌘K palette.
export const navConfig: NavConfig = {
  account: [
    {
      hideForImpersonator: true,
      href: '/dashboard/billing',
      icon: DollarSignIcon,
      name: 'Billing',
    },
    { href: '/gift', icon: Gift, name: 'Gift Pro' },
    { hideForImpersonator: true, href: '/dashboard/data', icon: HardDriveIcon, name: 'Your data' },
  ],
  bottom: [
    { href: '/dashboard/diagnostics', icon: Activity, name: 'Diagnostics', new: true },
    { hideForImpersonator: true, href: '/dashboard/managers', icon: Users, name: 'Team access' },
    // Pinned at the bottom of the rail, visible to everyone (incl. impersonators).
    HELP_CENTER,
    {
      adminOnly: true,
      children: [
        { href: '/dashboard/admin', name: 'Scheduled Messages' },
        { href: '/dashboard/admin/manage-channel', name: 'Manage Channel' },
        { href: '/dashboard/admin/test-gift', name: 'Test Gift' },
      ],
      hideForImpersonator: true,
      icon: ShieldCheck,
      key: 'admin-menu',
      name: 'Admin',
    },
  ],
  help: [
    HELP_CENTER,
    { href: 'https://discord.dotabod.com', icon: Discord, name: 'Discord' },
    { href: 'https://github.com/dotabod/', icon: Github, name: 'GitHub' },
    { href: 'https://status.dotabod.com', icon: Info, name: 'Service status' },
    { href: '/blog', icon: NewspaperIcon, name: 'Blog' },
  ],
  primary: [
    { hideForImpersonator: true, href: '/dashboard', icon: BeakerIcon, name: 'Setup' },
    { href: '/dashboard/features', icon: LayoutDashboard, name: 'Overview' },
    { href: '/dashboard/features/overlay', icon: MonitorPlay, name: 'Stream overlay' },
    { href: '/dashboard/features/chat', icon: MessagesSquare, name: 'Chat features' },
    { href: '/dashboard/commands', icon: SquareTerminal, name: 'Chat commands' },
    { href: '/dashboard/notable-players', icon: Star, name: 'Notable players' },
    { href: '/dashboard/features/advanced', icon: SlidersHorizontal, name: 'Advanced' },
    { href: '/dashboard/whats-new', icon: Sparkles, name: "What's New" },
  ],
}

/** True when the item should open in a new tab. */
export const isExternalNavItem = (item: NavItem): boolean =>
  item.external ?? Boolean(item.href?.startsWith('http'))

export const navItemToMenuItem = function navItemToMenuItem(
  item: NavItem,
  opts: { collapsed?: boolean; isChild?: boolean } = {},
): NonNullable<MenuProps['items']>[number] {
  const { collapsed = false, isChild = false } = opts
  const props = item.onClick ? { onClick: item.onClick } : {}

  let icon = item.icon ? <item.icon className='h-4 w-4' aria-hidden={true} /> : null
  // Collapsed rail hides child icons to avoid a doubled-up indent (Admin only now).
  if (collapsed && isChild) {
    icon = null
  }

  const external = isExternalNavItem(item)

  const label = item.href ? (
    <Link
      {...props}
      href={item.href}
      className='flex w-full min-w-0 flex-row items-center gap-2 text-gray-200!'
      target={external ? '_blank' : '_self'}
      rel={external ? 'noreferrer' : undefined}
    >
      <span className='min-w-0 flex-1 truncate'>{item.name}</span>
      {item.new && (
        <Tag color='green' className='m-0! shrink-0'>
          New
        </Tag>
      )}
    </Link>
  ) : (
    <div className='flex w-full min-w-0 flex-row items-center gap-2'>
      <span className='min-w-0 flex-1 truncate'>{item.name}</span>
      {item.new && (
        <Tag color='green' className='m-0! shrink-0'>
          New
        </Tag>
      )}
    </div>
  )

  return {
    children: item.children?.map((child) => navItemToMenuItem(child, { collapsed, isChild: true })),
    icon,
    key: item.href || item.key,
    label,
  } as NonNullable<MenuProps['items']>[number]
}

export const filterNav = function filterNav(
  items: NavItem[],
  opts: { isImpersonating?: boolean; isAdmin?: boolean } = {},
): NavItem[] {
  const { isImpersonating = false, isAdmin = false } = opts

  return items
    .map((item): NavItem | null => {
      if (isImpersonating && item.hideForImpersonator) {
        return null
      }

      if (item.adminOnly && !isAdmin) {
        return null
      }

      if (item.children) {
        const filteredChildren = item.children.filter(
          (child) => !(isImpersonating && child.hideForImpersonator),
        )

        if (filteredChildren.length === 0) {
          return null
        }

        return { ...item, children: filteredChildren }
      }

      return item
    })
    .filter((item): item is NavItem => Boolean(item))
}

// Dashboard root is matched exactly only — it's the ancestor of every dashboard
// route, so prefix-matching it would false-highlight Setup for billing/data.
const ROOT_PATH = '/dashboard'

// Flat map of every sidebar-selectable href -> its parent menu key ('' for top level).
const NAV_HREF_TO_PARENT: Record<string, string> = {}
for (const item of [...navConfig.primary, ...navConfig.bottom]) {
  if (item.href) {
    NAV_HREF_TO_PARENT[item.href] = ''
  }
  for (const child of item.children ?? []) {
    if (child.href) {
      NAV_HREF_TO_PARENT[child.href] = item.key ?? ''
    }
  }
}

/**
 * Resolve the sidebar item to highlight for a pathname.
 * Exact match wins (so /dashboard/features/overlay beats /dashboard/features),
 * then the nearest registered prefix — except the dashboard root, which is
 * exact-only so routes outside the sidebar (billing/data) highlight nothing.
 */
export const findBestMatchingMenuItem = (pathname: string): { key: string; parentKey: string } => {
  if (pathname in NAV_HREF_TO_PARENT) {
    return { key: pathname, parentKey: NAV_HREF_TO_PARENT[pathname] }
  }

  const parts = pathname.split('/')
  while (parts.length > 1) {
    parts.pop()
    const prefix = parts.join('/')
    if (prefix !== ROOT_PATH && prefix in NAV_HREF_TO_PARENT) {
      return { key: prefix, parentKey: NAV_HREF_TO_PARENT[prefix] }
    }
  }

  // No sidebar item owns this route — highlight nothing.
  return { key: '', parentKey: '' }
}
