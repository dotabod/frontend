import { signOut, useSession } from 'next-auth/react'

import { fetcher } from '@/lib/fetcher'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { Dropdown, Badge, Skeleton } from 'antd'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { BellOutlined } from '@ant-design/icons'
import clsx from 'clsx'
import type { Session } from 'next-auth'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import { useState } from 'react'

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
}

const UserButton = ({ user }: UserButtonProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const { data, isLoading: isSettingsLoading } = useSWR('/api/settings', fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  // Fetch gift notifications with dedupingInterval to prevent request pileup
  const { data: giftNotificationData, mutate: refreshGiftNotifications } = useSWR(
    '/api/gift-notifications?includeRead=true',
    fetcher,
    {
      dedupingInterval: 5000, // 5 seconds
      focusThrottleInterval: 10000, // 10 seconds
      loadingTimeout: 8000, // 8 seconds
      errorRetryInterval: 5000, // 5 seconds
      errorRetryCount: 3,
    },
  )

  const hasNotifications = giftNotificationData?.hasNotification || false
  const notifications = (giftNotificationData?.notifications || []) as GiftNotification[]
  const totalUnreadNotifications = notifications.filter((n) => !n.read).length

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5
  const totalNotifications = notifications.length

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
    <div className='flex items-center'>
      {/* Notification Bell with Headless UI Popover */}
      <Popover className='relative mr-4'>
        <PopoverButton className='flex items-center justify-center'>
          <div className='cursor-pointer'>
            <Badge count={totalUnreadNotifications} size='small'>
              <BellOutlined style={{ fontSize: '20px', color: '#fff' }} />
            </Badge>
          </div>
        </PopoverButton>

        <PopoverPanel
          transition
          className='absolute right-0 z-10 mt-5 w-screen max-w-sm transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in'
        >
          <div className='w-full rounded-xl bg-gray-900 p-4 text-sm/6 ring-1 shadow-lg ring-gray-700/5'>
            <div className='flex justify-between items-center mb-3'>
              <h3 className='font-semibold text-white text-lg'>Notifications</h3>
              {totalUnreadNotifications > 0 && (
                <span className='bg-blue-600 text-white text-xs px-2 py-1 rounded-full'>
                  {totalUnreadNotifications} new
                </span>
              )}
            </div>

            {totalNotifications > 0 ? (
              <div className='max-h-80 overflow-y-auto'>
                {notifications
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
                        <button
                          type='button'
                          onClick={() => dismissNotification(notification.id)}
                          className='mt-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors'
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  ))}

                {totalNotifications > pageSize && (
                  <div className='flex justify-between items-center mt-4'>
                    <button
                      type='button'
                      className={clsx(
                        'px-3 py-1 text-xs rounded-md transition-colors',
                        currentPage === 1
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-700 hover:bg-gray-600 text-white',
                      )}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </button>
                    <span className='text-gray-400 text-xs'>
                      Page {currentPage} of {Math.ceil(totalNotifications / pageSize)}
                    </span>
                    <button
                      type='button'
                      className={clsx(
                        'px-3 py-1 text-xs rounded-md transition-colors',
                        currentPage >= Math.ceil(totalNotifications / pageSize)
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-700 hover:bg-gray-600 text-white',
                      )}
                      disabled={currentPage >= Math.ceil(totalNotifications / pageSize)}
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, Math.ceil(totalNotifications / pageSize)),
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className='py-6 text-center text-gray-400'>No notifications</div>
            )}
          </div>
        </PopoverPanel>
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

              {/* Show skeleton while loading */}
              {(isSettingsLoading || !imageLoaded) && (
                <div className='w-10 h-10'>
                  <Skeleton.Avatar active size={40} shape='circle' />
                </div>
              )}

              {/* Hidden until loaded, then shown */}
              <div className={!imageLoaded ? 'hidden' : 'block'}>
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

export function UserAccountNav() {
  const user = useSession()?.data?.user

  if (!user) return null

  return <UserButton user={user} />
}
