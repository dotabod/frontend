import Banner from '@/components/Banner'
import CookieConsent from '@/components/CookieConsent'
import { DisableToggle } from '@/components/Dashboard/DisableToggle'
import { SubscriptionBadge } from '@/components/Dashboard/SubscriptionBadge'
import type { PARENT_KEYS } from '@/components/Dashboard/navigation'
import HubSpotIdentification from '@/components/HubSpotIdentification'
import HubSpotScript from '@/components/HubSpotScript'
import { DarkLogo, Logomark } from '@/components/Logo'
import { UserAccountNav } from '@/components/UserAccountNav'
import useMaybeSignout from '@/lib/hooks/useMaybeSignout'
import { captureException } from '@sentry/nextjs'
import { Layout, Menu, type MenuProps, Tag, theme } from 'antd'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type React from 'react'
import { useEffect, useState } from 'react'
import ModeratedChannels from './ModeratedChannels'
import { navigation } from './navigation'
import GiftNotification from '@/components/Subscription/GiftNotification'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

const { Header, Sider, Content } = Layout

// Add SEO interface
interface SEOProps {
  title?: string
  description?: string
  ogImage?: string
  canonicalUrl?: string
  ogType?: string
  noindex?: boolean
}

function getItem(item) {
  const props = item.onClick ? { onClick: item.onClick } : {}

  return {
    key: item.href || item.key,
    icon: item.icon ? <item.icon className={clsx('h-4 w-4')} aria-hidden='true' /> : null,
    label: item.href ? (
      <Link
        {...props}
        href={item.href}
        className='text-gray-200! flex flex-row gap-2 items-center'
        target={item.href.startsWith('http') ? '_blank' : '_self'}
      >
        {item.name}
        {item.new && <Tag color='green'>New</Tag>}
      </Link>
    ) : (
      <div className='flex flex-row gap-2 items-center'>
        {item.name}
        {item.new && <Tag color='green'>New</Tag>}
      </div>
    ),
    children: item.children?.map(getItem),
  }
}

// Add helper function to check if item should be hidden during impersonation
const shouldHideForImpersonator = (itemName: string) => {
  return ['Setup', 'Managers', 'Billing', 'Data', 'Account', 'Admin'].includes(itemName)
}

const shouldShowAdminItems = (itemKey: keyof typeof PARENT_KEYS, role?: string[]) => {
  return itemKey === 'ADMIN' && role?.includes('admin')
}

// Create mapping dynamically from navigation structure
const PATH_TO_PARENT_KEY: Record<string, string> = {}
for (const item of navigation) {
  if (item.children) {
    // For each parent with children, map all child hrefs to parent key
    for (const child of item.children) {
      if (child.href) {
        PATH_TO_PARENT_KEY[child.href] = item.key || ''
      }
    }
  }
}

// Helper function to find the best matching menu item for a given path
const findBestMatchingMenuItem = (pathname: string) => {
  // First try exact match
  if (PATH_TO_PARENT_KEY[pathname]) {
    return { key: pathname, parentKey: PATH_TO_PARENT_KEY[pathname] }
  }

  // For nested routes like /dashboard/features/something
  // Try to find the closest parent path
  const pathParts = pathname.split('/')
  while (pathParts.length > 1) {
    pathParts.pop()
    const parentPath = pathParts.join('/')
    if (PATH_TO_PARENT_KEY[parentPath]) {
      return { key: parentPath, parentKey: PATH_TO_PARENT_KEY[parentPath] }
    }
  }

  // Default to dashboard if no match found
  return { key: '/dashboard', parentKey: '' }
}

export default function DashboardShell({
  children,
  seo,
}: {
  children: React.ReactElement
  seo?: SEOProps
}) {
  const { status, data } = useSession()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [broken, setBroken] = useState(false)
  const {
    token: { colorBgLayout },
  } = theme.useToken()
  const [current, setCurrent] = useState('/dashboard')
  const [openKeys, setOpenKeys] = useState<string[]>([])

  // Default SEO values
  const defaultTitle = 'Dashboard | Dotabod'
  const defaultDescription =
    'Manage your Dotabod settings, commands, and features to enhance your Dota 2 streaming experience.'
  const defaultOgImage = `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/images/welcome.png`
  const defaultUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/dashboard`

  // Use SEO props if provided, otherwise use defaults
  const pageTitle = seo?.title || defaultTitle
  const pageDescription = seo?.description || defaultDescription
  const pageImage = seo?.ogImage || defaultOgImage
  const pageUrl = seo?.canonicalUrl || defaultUrl
  const pageType = seo?.ogType || 'website'

  const onClick: MenuProps['onClick'] = (e) => {
    setCurrent(e.key)
    if (broken) setCollapsed(true)
  }

  // Handle submenu open/close
  const onOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setOpenKeys(keys)
  }

  useMaybeSignout()

  useEffect(() => {
    const lastUpdate = localStorage.getItem('lastSingleRunAPI')
    const now = new Date()

    if (!lastUpdate || now.getTime() - Number(lastUpdate) > 24 * 60 * 60 * 1000) {
      localStorage.setItem('lastSingleRunAPI', String(now.getTime()))

      fetch('/api/update-followers').catch((error) => {
        captureException(error)

        return console.error(error)
      })
      fetch('/api/make-dotabod-mod').catch((error) => {
        captureException(error)

        return console.error(error)
      })
    }
  }, [])

  // Update selected menu item and open parent menu when route changes
  useEffect(() => {
    const { pathname } = router
    const { key, parentKey } = findBestMatchingMenuItem(pathname)

    setCurrent(key)

    if (parentKey && !openKeys.includes(parentKey)) {
      setOpenKeys((prev) => [...prev, parentKey])
    }
  }, [router, openKeys])

  // Fetch gift notifications from the API
  const { data: giftNotificationData, mutate: refreshGiftNotifications } = useSWR(
    status === 'authenticated' ? '/api/gift-notifications' : null,
    fetcher,
  )

  const [hasGiftNotification, setHasGiftNotification] = useState(false)
  const [giftDetails, setGiftDetails] = useState<{
    id: string
    senderName: string
    giftMessage?: string
    giftType: 'monthly' | 'annual' | 'lifetime'
  } | null>(null)
  const [totalGiftedMonths, setTotalGiftedMonths] = useState<number | 'lifetime'>(0)
  const [hasLifetime, setHasLifetime] = useState(false)
  const [totalNotifications, setTotalNotifications] = useState(0)

  // Update notification state when data changes
  useEffect(() => {
    if (giftNotificationData?.hasNotification && giftNotificationData.notifications?.length > 0) {
      // Get the first unread notification
      const firstNotification = giftNotificationData.notifications[0]
      setGiftDetails({
        id: firstNotification.id,
        senderName: firstNotification.senderName,
        giftMessage: firstNotification.giftMessage,
        giftType: firstNotification.giftType,
      })
      setHasGiftNotification(true)

      // Set total gifted months and lifetime status
      setTotalGiftedMonths(giftNotificationData.totalGiftedMonths || 0)
      setHasLifetime(giftNotificationData.hasLifetime || false)
      setTotalNotifications(giftNotificationData.totalNotifications || 0)
    } else {
      setHasGiftNotification(false)
      setGiftDetails(null)
    }
  }, [giftNotificationData])

  const dismissGiftNotification = async () => {
    if (giftDetails?.id) {
      try {
        // Call API to mark notification as read
        const response = await fetch('/api/gift-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationId: giftDetails.id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Failed to mark notification as read:', errorData)
          throw new Error(errorData.message || 'Failed to mark notification as read')
        }

        // Refresh notifications after marking as read
        refreshGiftNotifications()
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }
  }

  if (status !== 'authenticated') return null

  const filterNavigationItems = (items) => {
    if (!data?.user?.isImpersonating) return items

    return items
      .map((item) => {
        if (!item.name) return item // Keep dividers

        // Hide parent items that should be restricted
        if (shouldHideForImpersonator(item.name)) return null

        // Hide admin items if user is not an admin
        if (!shouldShowAdminItems(item.key, data?.user?.role)) return null

        // If item has children, filter them too
        if (item.children) {
          const filteredChildren = item.children.filter(
            (child) => !shouldHideForImpersonator(child.name),
          )

          // If no children left after filtering, hide the parent item
          if (filteredChildren.length === 0) return null

          return {
            ...item,
            children: filteredChildren,
          }
        }

        return item
      })
      .filter(Boolean) // Remove null items
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name='title' content={pageTitle} />
        <meta name='description' content={pageDescription} />
        <meta property='og:type' content={pageType} />
        <meta property='og:url' content={pageUrl} />
        <meta property='og:title' content={pageTitle} />
        <meta property='og:description' content={pageDescription} />
        <meta property='og:image' content={pageImage} />

        <meta property='twitter:card' content='summary_large_image' />
        <meta property='twitter:url' content={pageUrl} />
        <meta property='twitter:title' content={pageTitle} />
        <meta property='twitter:description' content={pageDescription} />
        <meta property='twitter:image' content={pageImage} />

        {seo?.canonicalUrl && <link rel='canonical' href={seo.canonicalUrl} />}

        {/* Dashboard pages should generally not be indexed by search engines */}
        {seo?.noindex !== false && <meta name='robots' content='noindex, nofollow' />}
      </Head>
      <Banner />
      <HubSpotScript />
      <HubSpotIdentification />
      <Layout className='h-full bg-gray-800'>
        <Sider
          breakpoint='md'
          onBreakpoint={(broken) => {
            setCollapsed(broken)
            setBroken(broken)
          }}
          style={{
            background: colorBgLayout,
          }}
          width={250}
          className={clsx('border-r-transparent', collapsed && 'min-w-11! max-w-11!')}
          trigger={null}
          collapsible
          collapsed={collapsed}
        >
          <div className='logo' />

          <div className='flex flex-col items-end'>
            <div className='w-full md:max-w-xs'>
              <div className='m-auto mb-4 flex h-12 w-full px-4 pt-4 justify-center'>
                {!collapsed ? (
                  <Link href='/'>
                    <DarkLogo className='h-full w-auto' />
                  </Link>
                ) : (
                  <Link href='/'>
                    <Logomark className='h-full w-auto' aria-hidden='true' />
                  </Link>
                )}
              </div>

              <SubscriptionBadge collapsed={collapsed} />

              {!collapsed && (
                <div className='flex justify-center py-4'>
                  <ModeratedChannels />
                </div>
              )}

              <Menu
                onClick={onClick}
                selectedKeys={[current]}
                openKeys={openKeys}
                onOpenChange={onOpenChange}
                style={{
                  background: colorBgLayout,
                  borderInlineEnd: 'none',
                }}
                mode='inline'
                items={filterNavigationItems(navigation).map((item, i) => {
                  if (!item.name)
                    return {
                      key: item?.href || i,
                      type: 'divider',
                      className: 'm-6! bg-gray-500!',
                    }

                  return getItem(item)
                })}
              />
            </div>
          </div>
        </Sider>
        <Layout className={clsx('bg-gray-800!', broken && !collapsed && 'hidden!')}>
          <Header
            className={clsx(
              'bg-gray-900!',
              broken && !collapsed && 'hidden!',
              'flex w-full items-center justify-between p-8!',
            )}
          >
            <DisableToggle />

            <div className='w-fit py-2'>
              <UserAccountNav />
            </div>
          </Header>
          {hasGiftNotification && giftDetails && (
            <GiftNotification
              senderName={giftDetails.senderName}
              giftMessage={giftDetails.giftMessage}
              giftType={giftDetails.giftType as 'monthly' | 'annual' | 'lifetime'}
              onDismiss={dismissGiftNotification}
              totalGiftedMonths={totalGiftedMonths}
              hasLifetime={hasLifetime}
              totalNotifications={totalNotifications}
            />
          )}
          <Content className='min-h-full w-full space-y-6 bg-gray-800 p-8 transition-all'>
            {children}
          </Content>
        </Layout>
      </Layout>
      <CookieConsent />
      <div className='pt-4 pb-1 text-center text-xs text-gray-400 bg-gray-900 border-t border-gray-700'>
        <p>
          Dota 2 and the Dota 2 logo are registered trademarks of Valve Corporation. This site is
          not affiliated with Valve Corporation.
        </p>
      </div>
    </>
  )
}
