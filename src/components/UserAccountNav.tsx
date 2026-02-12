import { BellOutlined } from '@ant-design/icons'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { Badge, Button, Dropdown, Empty, Popover, Skeleton, Space, Tabs } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import type { Session } from 'next-auth'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'

// Define the notification type
interface GiftNotification {
  id: string
  senderName: string
  giftMessage?: string
  giftType: 'monthly' | 'annual' | 'lifetime'
  giftQuantity?: number
  createdAt: string
  read?: boolean
}

interface UserButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  user: Session['user']
  icon?: React.ReactNode
  className?: string
}

const UserButton = ({ user, className }: UserButtonProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const { data, isLoading: isSettingsLoading } = useSWR(
    '/api/settings',
    fetcher,
    SETTINGS_SWR_OPTIONS,
  )

  // Fetch gift notifications with dedupingInterval to prevent request pileup
  const {
    data: giftNotificationData,
    error: notificationError,
    mutate: refreshGiftNotifications,
  } = useSWR('/api/gift-notifications?includeRead=true', fetcher, {
    // Configuration to fetch only once on mount
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    // Keep error handling
    loadingTimeout: 8000, // 8 seconds
    errorRetryInterval: 5000, // 5 seconds
    errorRetryCount: 3,
    onErrorRetry: (_error, _key, _config, revalidate, { retryCount }) => {
      // Only retry up to 3 times
      if (retryCount >= 3) return

      // Retry after 5 seconds
      setTimeout(() => revalidate({ retryCount }), 5000)
    },
  })

  // Force image to load even if notifications fail
  useEffect(() => {
    // If there's an error with notifications or it's taking too long,
    // ensure the image is shown after a timeout
    const timer = setTimeout(() => {
      if (!imageLoaded) {
        setImageLoaded(true)
      }
    }, 3000) // 3 seconds timeout

    return () => clearTimeout(timer)
  }, [imageLoaded])

  const hasNotifications = giftNotificationData?.hasNotification || false
  const notifications = (giftNotificationData?.notifications || []) as GiftNotification[]
  const totalUnreadNotifications = notifications.filter((n) => !n.read).length

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // Add notification filter state
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all')

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !notification.read
    if (activeTab === 'read') return notification.read
    return true
  })

  // Sort notifications - unread first
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // First sort by read status (unread first)
    if (a.read !== b.read) {
      return a.read ? 1 : -1
    }
    // Then sort by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const totalFilteredNotifications = filteredNotifications.length

  const isLive = data?.stream_online

  // Handle notification dismissal
  const dismissNotification = async (notificationId: string) => {
    try {
      await fetch('/api/gift-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
        }),
      })

      // Refresh notifications after dismissal
      refreshGiftNotifications()
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
    }
  }

  // Format gift type for display
  const formatGiftType = (type: string, quantity = 1) => {
    if (quantity <= 1) {
      switch (type) {
        case 'monthly':
          return 'a month of Dotabod Pro'
        case 'annual':
          return 'a year of Dotabod Pro'
        case 'lifetime':
          return 'Dotabod Pro Lifetime'
        default:
          return 'Dotabod Pro'
      }
    }

    switch (type) {
      case 'monthly':
        return `${quantity} months of Dotabod Pro`
      case 'annual':
        return `${quantity} years of Dotabod Pro`
      case 'lifetime':
        return 'Dotabod Pro Lifetime'
      default:
        return 'Dotabod Pro'
    }
  }

  return (
    <div className={clsx('flex items-center', className)}>
      {/* Notification Bell with Ant Design Popover */}
      <Popover
        trigger='click'
        content={
          <div className='w-full max-w-sm'>
            <div className='flex justify-between items-center mb-3'>
              <h3 className='font-semibold text-white text-lg'>Notifications</h3>
              {totalUnreadNotifications > 0 && (
                <span className='bg-blue-600 text-white text-xs px-2 py-1 rounded-full'>
                  {totalUnreadNotifications} new
                </span>
              )}
            </div>

            <Tabs
              defaultActiveKey='all'
              onChange={(key) => {
                setActiveTab(key as 'all' | 'unread' | 'read')
                setCurrentPage(1)
              }}
              items={[
                {
                  key: 'all',
                  label: 'All',
                },
                {
                  key: 'unread',
                  label: `Unread ${totalUnreadNotifications > 0 ? `(${totalUnreadNotifications})` : ''}`,
                },
                {
                  key: 'read',
                  label: 'Read',
                },
              ]}
            />

            {notificationError ? (
              <div className='py-6 text-center text-gray-400'>
                Unable to load notifications. Please try again later.
              </div>
            ) : totalFilteredNotifications > 0 ? (
              <div className='max-h-80 overflow-y-auto'>
                {sortedNotifications
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((notification) => (
                    <div
                      key={notification.id}
                      className={clsx(
                        'relative rounded-lg p-4 mb-2',
                        notification.read ? 'bg-gray-800/50' : 'bg-gray-800',
                      )}
                    >
                      <div className='flex justify-between items-start'>
                        <div className='font-semibold text-white'>Gift Subscription</div>
                        <div className='text-xs text-gray-400'>
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className='mt-1 text-gray-300'>
                        {`${notification.senderName || 'Someone'} has gifted you ${formatGiftType(notification.giftType, notification.giftQuantity)}!`}
                      </p>
                      {notification.giftMessage && (
                        <p className='mt-2 italic text-gray-400'>"{notification.giftMessage}"</p>
                      )}
                      {!notification.read && (
                        <Button
                          onClick={() => dismissNotification(notification.id)}
                          className='mt-2'
                          size='small'
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  ))}

                {totalFilteredNotifications > pageSize && (
                  <div className='flex justify-between items-center mt-4'>
                    <Space>
                      <Button
                        type='text'
                        size='small'
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      >
                        Previous
                      </Button>
                      <span className='text-gray-400 text-xs'>
                        Page {currentPage} of {Math.ceil(totalFilteredNotifications / pageSize)}
                      </span>
                      <Button
                        type='text'
                        size='small'
                        disabled={currentPage >= Math.ceil(totalFilteredNotifications / pageSize)}
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, Math.ceil(totalFilteredNotifications / pageSize)),
                          )
                        }
                      >
                        Next
                      </Button>
                    </Space>
                  </div>
                )}
              </div>
            ) : (
              <Empty
                description={
                  activeTab === 'all'
                    ? 'No notifications'
                    : activeTab === 'unread'
                      ? 'No unread notifications'
                      : 'No read notifications'
                }
                className='py-6'
              />
            )}
          </div>
        }
      >
        <div className='cursor-pointer mr-4'>
          <Badge count={notificationError ? 0 : totalUnreadNotifications} size='small'>
            <BellOutlined style={{ fontSize: '20px', color: '#fff' }} />
          </Badge>
        </div>
      </Popover>

      {/* User Profile with loading skeleton */}
      <Dropdown
        menu={{
          items: [
            {
              label: <Link href='/dashboard'>Dashboard</Link>,
              key: 'dashboard',
            },
            {
              label: 'Logout',
              key: 'logout',
              onClick: () => {
                signOut({
                  callbackUrl: window.location.origin,
                  redirect: true,
                })
              },
            },
          ],
        }}
      >
        <Link href='/dashboard'>
          <div className='flex items-center cursor-pointer'>
            <div className='relative'>
              {isLive && (
                <span className='absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full z-10'>
                  Live
                </span>
              )}

              {/* Show skeleton while loading, but only for a reasonable time */}
              {(isSettingsLoading || !imageLoaded) && (
                <div className='w-10 h-10'>
                  <Skeleton.Avatar active size={40} shape='circle' />
                </div>
              )}

              {/* Hidden until loaded, then shown */}
              <div className={!imageLoaded || isSettingsLoading ? 'hidden' : 'block'}>
                <Image
                  width={40}
                  height={40}
                  alt='User Avatar'
                  src={user?.image || '/images/hero/default.png'}
                  className='rounded-full'
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            </div>

            <div className='ml-3 flex flex-col'>
              {isSettingsLoading ? (
                <>
                  <Skeleton.Input active size='small' style={{ width: 100, height: 16 }} />
                  <div className='mt-1'>
                    <Skeleton.Input active size='small' style={{ width: 80, height: 14 }} />
                  </div>
                </>
              ) : (
                <>
                  <p className='text-base font-medium text-white uppercase my-0!'>
                    {user?.name || 'TECHLEED'}
                  </p>
                  <p className='text-sm text-gray-400 my-0!'>
                    {isLive ? 'Streaming now' : 'Offline'}
                  </p>
                </>
              )}
            </div>

            <ChevronDownIcon className='h-5 w-5 ml-2 text-gray-400' />
          </div>
        </Link>
      </Dropdown>
    </div>
  )
}

UserButton.displayName = 'UserButton'

interface UserAccountNavProps {
  className?: string
}

export function UserAccountNav({ className }: UserAccountNavProps) {
  const user = useSession()?.data?.user

  if (!user) return null

  return <UserButton user={user} className={className} />
}
