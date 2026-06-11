import { Bars3Icon } from '@heroicons/react/24/outline'
import { CopyButton } from '@mantine/core'
import { captureException } from '@sentry/nextjs'
import { Button, Drawer, Layout, Menu, type MenuProps, theme } from 'antd'
import clsx from 'clsx'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import type React from 'react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Banner from '@/components/Banner'
import CookieConsent from '@/components/CookieConsent'
import { DisableToggle } from '@/components/Dashboard/DisableToggle'
import { SubscriptionBadge } from '@/components/Dashboard/SubscriptionBadge'
import HubSpot from '@/components/HubSpot'
import { DarkLogo } from '@/components/Logo'
import GiftNotification from '@/components/Subscription/GiftNotification'
import { UserAccountNav } from '@/components/UserAccountNav'
import { useFeatureAccess } from '@/hooks/useSubscription'
import { fetcher } from '@/lib/fetcher'
import { useBaseUrl } from '@/lib/hooks/useBaseUrl'
import useMaybeSignout from '@/lib/hooks/useMaybeSignout'
import { STABLE_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'
import { HelpMenu } from './HelpMenu'
import { filterNav, findBestMatchingMenuItem, navConfig, navItemToMenuItem } from './navigation'
import { SettingsSearch } from './SettingsSearch'

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

export default function DashboardShell({
  children,
  seo,
}: {
  children: React.ReactElement
  seo?: SEOProps
}) {
  const { status, data } = useSession()
  const router = useRouter()
  // `broken` (set by the Sider breakpoint) is our single "is mobile" signal.
  const [broken, setBroken] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const copyOverlayUrl = useBaseUrl(`overlay/${data?.user?.id ?? ''}`)
  const {
    token: { colorBgLayout },
  } = theme.useToken()
  // Seed selection from the initial route so off-sidebar pages (billing/data/help)
  // don't briefly false-highlight Setup before the route effect runs.
  const [current, setCurrent] = useState(() => findBestMatchingMenuItem(router.pathname).key)
  const [adminOpenKeys, setAdminOpenKeys] = useState<string[]>(() => {
    const { parentKey } = findBestMatchingMenuItem(router.pathname)
    return parentKey ? [parentKey] : []
  })

  // Default SEO values
  const defaultTitle = 'Dashboard | Dotabod'
  const defaultDescription =
    'Manage your Dotabod settings, commands, and features to enhance your Dota 2 streaming experience.'
  const host =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    (typeof window !== 'undefined' ? window.location.host : 'dotabod.com')
  const defaultOgImage = `https://${host}/images/welcome.png`
  const defaultUrl = `https://${host}/dashboard`

  // Use SEO props if provided, otherwise use defaults
  const pageTitle = seo?.title || defaultTitle
  const pageDescription = seo?.description || defaultDescription
  const pageImage = seo?.ogImage || defaultOgImage
  const pageUrl = seo?.canonicalUrl || defaultUrl
  const pageType = seo?.ogType || 'website'
  const { hasAccess: hasAutoModeratorAccess } = useFeatureAccess('autoModerator')

  // Handle Admin accordion open/close
  const onAdminOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setAdminOpenKeys(keys)
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
      if (hasAutoModeratorAccess) {
        fetch('/api/make-dotabod-mod').catch((error) => {
          captureException(error)

          return console.error(error)
        })
      }
    }
  }, [hasAutoModeratorAccess])

  // Update selected menu item (and open the Admin accordion) when the route changes
  useEffect(() => {
    const { pathname } = router
    const { key, parentKey } = findBestMatchingMenuItem(pathname)

    setCurrent(key)

    if (parentKey && !adminOpenKeys.includes(parentKey)) {
      setAdminOpenKeys((prev) => [...prev, parentKey])
    }
  }, [router.pathname, router.asPath])

  // Close the mobile drawer once we're back on a desktop layout
  useEffect(() => {
    if (!broken) {
      setDrawerOpen(false)
    }
  }, [broken])

  // Fetch notifications from the API (gift toast filters to gift type below)
  const { data: giftNotificationData, mutate: refreshGiftNotifications } = useSWR(
    status === 'authenticated' ? '/api/notifications' : null,
    fetcher,
    STABLE_SWR_OPTIONS,
  )

  const [hasGiftNotification, setHasGiftNotification] = useState(false)
  const [giftDetails, setGiftDetails] = useState<{
    id: string
    senderName: string
    giftMessage?: string
    giftType: 'monthly' | 'annual' | 'lifetime'
    giftQuantity?: number
  } | null>(null)
  const [hasLifetime, setHasLifetime] = useState(false)
  const [totalNotifications, setTotalNotifications] = useState(0)

  // Update notification state when data changes
  useEffect(() => {
    // This toast is gift-specific; the notifications endpoint now returns other types
    // too (e.g. new-feature), so consider only unread GIFT_SUBSCRIPTION rows.
    const unreadGifts = (giftNotificationData?.notifications || []).filter(
      (n) => n?.type === 'GIFT_SUBSCRIPTION' && !n?.read,
    )
    const giftNotification = unreadGifts[0]
    if (giftNotification) {
      setGiftDetails({
        giftMessage: giftNotification.giftMessage,
        giftQuantity: giftNotification.giftQuantity || 1,
        giftType: giftNotification.giftType,
        id: giftNotification.id,
        senderName: giftNotification.senderName,
      })
      setHasGiftNotification(true)
    } else {
      setHasGiftNotification(false)
      setGiftDetails(null)
    }

    setHasLifetime(giftNotificationData?.hasLifetime || false)
    // Gift-only count for the toast copy; the endpoint's totalNotifications mixes types.
    setTotalNotifications(unreadGifts.length)
  }, [giftNotificationData])

  const dismissGiftNotification = async () => {
    if (giftDetails?.id) {
      try {
        // Call API to mark notification as read
        const response = await fetch('/api/notifications', {
          body: JSON.stringify({
            notificationId: giftDetails.id,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Failed to mark notification as read:', errorData)
          throw new Error(errorData.message || 'Failed to mark notification as read')
        }

        // Refresh notifications after marking as read
        void refreshGiftNotifications()
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }
  }

  if (status !== 'authenticated') {
    return null
  }

  const isImpersonating = Boolean(data?.user?.isImpersonating)
  const isAdmin = data?.user?.role === 'admin'
  const navOpts = { isAdmin, isImpersonating }

  // Region item lists, filtered once for the current viewer.
  const primaryItems = filterNav(navConfig.primary, navOpts)
  const bottomItems = filterNav(navConfig.bottom, navOpts)
  const utilityItems = bottomItems.filter((item) => !item.adminOnly)
  const adminItems = bottomItems.filter((item) => item.adminOnly)

  // The flat primary rail + bottom-pinned utilities. Rendered (with full labels) in
  // both the desktop Sider and the mobile Drawer so the two never drift apart.
  const renderNav = ({ onNavigate }: { onNavigate?: () => void }) => {
    const onMenuClick: MenuProps['onClick'] = (e) => {
      setCurrent(e.key)
      onNavigate?.()
    }

    const menuStyle = { background: colorBgLayout, borderInlineEnd: 'none' as const }

    return (
      <div className='flex h-full flex-col'>
        <div>
          <div className='m-auto mb-4 flex h-12 w-full justify-center gap-2 px-4 pt-4'>
            <Link href='/'>
              <DarkLogo className='h-full w-auto' />
            </Link>
          </div>

          <SubscriptionBadge collapsed={false} />

          <div className='flex justify-center py-2'>
            <DisableToggle />
          </div>

          <Menu
            onClick={onMenuClick}
            selectedKeys={[current]}
            style={menuStyle}
            mode='inline'
            items={primaryItems.map((item) => navItemToMenuItem(item))}
          />
        </div>

        {(utilityItems.length > 0 || adminItems.length > 0) && (
          <div className='mt-auto border-t border-gray-700 pt-2'>
            {utilityItems.length > 0 && (
              <Menu
                onClick={onMenuClick}
                selectedKeys={[current]}
                style={menuStyle}
                mode='inline'
                items={utilityItems.map((item) => navItemToMenuItem(item))}
              />
            )}

            {adminItems.length > 0 && (
              <Menu
                onClick={onMenuClick}
                selectedKeys={[current]}
                openKeys={adminOpenKeys}
                onOpenChange={onAdminOpenChange}
                style={menuStyle}
                mode='inline'
                items={adminItems.map((item) => navItemToMenuItem(item))}
              />
            )}
          </div>
        )}
      </div>
    )
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
        {seo?.noindex && <meta name='robots' content='noindex, nofollow' />}
      </Head>
      <Banner />
      <HubSpot />
      <Layout className='h-full bg-gray-800'>
        <Sider
          breakpoint='md'
          collapsedWidth={0}
          onBreakpoint={setBroken}
          style={{
            background: colorBgLayout,
          }}
          width={250}
          className='border-r-transparent'
          trigger={null}
          collapsible
          collapsed={broken}
        >
          {/* On mobile the Sider collapses to 0 width; skip its content so it can't
              leak past the zero-width container — the Drawer handles mobile nav. */}
          {!broken && renderNav({})}
        </Sider>

        <Drawer
          placement='left'
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={250}
          closable={false}
          rootClassName='md:hidden'
          styles={{ body: { background: colorBgLayout, padding: 0 } }}
        >
          {renderNav({ onNavigate: () => setDrawerOpen(false) })}
        </Drawer>

        <Layout className='bg-gray-800!'>
          <Header className='flex w-full items-center justify-between gap-4 bg-gray-900! p-4! md:p-8!'>
            <div className='flex flex-1 items-center gap-3'>
              <Button
                type='text'
                aria-label='Open navigation menu'
                className='flex items-center md:hidden!'
                icon={<Bars3Icon className='h-6 w-6 text-gray-200' />}
                onClick={() => setDrawerOpen(true)}
              />
              <div className='w-full max-w-lg'>
                <SettingsSearch />
              </div>
            </div>

            <div className='flex w-fit items-center gap-3 py-2'>
              <div className='hidden md:block'>
                <CopyButton value={copyOverlayUrl}>
                  {({ copied, copy }) => (
                    <Button
                      type='dashed'
                      size='small'
                      className={clsx(copied && 'border-green-600! text-green-600!')}
                      onClick={copy}
                    >
                      {copied ? 'Overlay URL copied' : 'Copy Overlay URL'}
                    </Button>
                  )}
                </CopyButton>
              </div>
              <HelpMenu />
              <UserAccountNav />
            </div>
          </Header>
          {hasGiftNotification && giftDetails && (
            <GiftNotification
              senderName={giftDetails.senderName}
              giftMessage={giftDetails.giftMessage}
              giftType={giftDetails.giftType as 'monthly' | 'annual' | 'lifetime'}
              giftQuantity={giftDetails.giftQuantity}
              onDismiss={dismissGiftNotification}
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
