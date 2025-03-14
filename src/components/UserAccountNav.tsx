import { signOut, useSession } from 'next-auth/react'

import { fetcher } from '@/lib/fetcher'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { Dropdown, Space, Badge, Popover, Button, Typography, List } from 'antd'
import clsx from 'clsx'
import type { Session } from 'next-auth'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import { BellOutlined } from '@ant-design/icons'
import { useState } from 'react'

const { Text } = Typography

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
  const { data } = useSWR('/api/settings', fetcher, {
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

  // Notification popover content
  const notificationContent = (
    <div
      style={{
        maxWidth: 300,
        maxHeight: 400,
        overflow: 'auto',
        backgroundColor: '#1a1a1a',
        color: '#fff',
      }}
    >
      {totalNotifications > 0 ? (
        <>
          <List
            itemLayout='vertical'
            dataSource={notifications.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            renderItem={(notification: GiftNotification) => (
              <List.Item
                key={notification.id}
                extra={
                  !notification.read ? (
                    <Button size='small' onClick={() => dismissNotification(notification.id)}>
                      Dismiss
                    </Button>
                  ) : (
                    <Text type='secondary' style={{ fontSize: '12px' }}>
                      Read
                    </Text>
                  )
                }
                style={{
                  backgroundColor: notification.read ? '#1f1f1f' : '#2a2a2a',
                  opacity: notification.read ? 0.8 : 1,
                }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gift Subscription</span>
                      <Text type='secondary' style={{ fontSize: '12px' }}>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </Text>
                    </div>
                  }
                  description={`${notification.senderName || 'Someone'} has gifted you ${formatGiftType(notification.giftType, notification.giftQuantity)}!`}
                />
                {notification.giftMessage && (
                  <Text italic style={{ display: 'block', marginTop: 8 }}>
                    "{notification.giftMessage}"
                  </Text>
                )}
              </List.Item>
            )}
          />
          {totalNotifications > pageSize && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
              <Button
                size='small'
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                style={{ backgroundColor: '#2a2a2a', borderColor: '#444', color: '#fff' }}
              >
                Previous
              </Button>
              <Text style={{ margin: '0 12px', color: '#bfbfbf' }}>
                Page {currentPage} of {Math.ceil(totalNotifications / pageSize)}
              </Text>
              <Button
                size='small'
                disabled={currentPage >= Math.ceil(totalNotifications / pageSize)}
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(prev + 1, Math.ceil(totalNotifications / pageSize)),
                  )
                }
                style={{ backgroundColor: '#2a2a2a', borderColor: '#444', color: '#fff' }}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <Text style={{ color: '#bfbfbf' }}>No notifications</Text>
      )}
    </div>
  )

  return (
    <div className='flex items-center'>
      {/* Notification Bell */}
      <Popover
        content={notificationContent}
        title='Notifications'
        trigger='click'
        placement='bottomRight'
        arrow={{ pointAtCenter: true }}
      >
        <div className='mr-4 cursor-pointer'>
          <Badge count={totalUnreadNotifications} size='small'>
            <BellOutlined style={{ fontSize: '20px', color: '#fff' }} />
          </Badge>
        </div>
      </Popover>

      {/* User Profile */}
      <Link href='/dashboard/features'>
        <div
          className={clsx(
            `outline:transparent group block h-full w-full cursor-pointer rounded-md border border-transparent px-3.5
              py-2 text-left text-sm transition-all
              `,
          )}
        >
          <div className='flex h-full w-full items-center justify-between space-x-4'>
            <Dropdown
              menu={{
                items: [
                  {
                    label: 'Logout',
                    key: 'logout',
                    onClick: () => {
                      signOut({
                        callbackUrl: `${window.location.origin}/`,
                      })
                    },
                  },
                ],
              }}
            >
              <Space>
                {isLive ? (
                  <span className='rounded-md bg-red-700 px-2 py-0.5 text-xs'>Live</span>
                ) : (
                  <span className='rounded-md bg-gray-700 px-2 py-0.5 text-xs'>Offline</span>
                )}
                <Image
                  width={40}
                  height={40}
                  alt='User Avatar'
                  src={user?.image || '/images/hero/default.png'}
                  className={clsx(isLive && 'rounded-full border-2 border-solid border-red-500')}
                />
                <ChevronDownIcon className='h-4 w-4' />
              </Space>
            </Dropdown>
          </div>
        </div>
      </Link>
    </div>
  )
}

UserButton.displayName = 'UserButton'

export function UserAccountNav() {
  const user = useSession()?.data?.user

  if (!user) return null

  return <UserButton user={user} />
}
