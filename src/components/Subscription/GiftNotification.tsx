import type React from 'react'
import { Typography, Space, App } from 'antd'
import { GiftOutlined } from '@ant-design/icons'
import { useEffect } from 'react'

const { Text, Paragraph } = Typography

interface GiftNotificationProps {
  senderName: string
  giftMessage?: string
  giftType: 'monthly' | 'annual' | 'lifetime'
  giftQuantity?: number
  onDismiss: () => void
  totalGiftedMonths?: number | 'lifetime'
  hasLifetime?: boolean
  totalNotifications?: number
}

const GiftNotification: React.FC<GiftNotificationProps> = ({
  senderName,
  giftMessage,
  giftType,
  giftQuantity = 1,
  onDismiss,
  totalGiftedMonths = 0,
  hasLifetime = false,
  totalNotifications = 1,
}) => {
  // Use App's notification API
  const { notification } = App.useApp()

  // Format the gift type for display
  const getGiftTypeDisplay = (type: 'monthly' | 'annual' | 'lifetime', quantity: number) => {
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

    // For quantity > 1
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

  const giftTypeDisplay = getGiftTypeDisplay(giftType, giftQuantity)

  // Format total gifted months message
  const getTotalGiftedMessage = () => {
    if (hasLifetime) {
      return 'You have Dotabod Pro Lifetime from gift subscriptions!'
    }

    if (typeof totalGiftedMonths === 'number') {
      if (totalGiftedMonths === 1) {
        return 'You have 1 month of Dotabod Pro from gift subscriptions.'
      }

      if (totalGiftedMonths > 1) {
        return `You have ${totalGiftedMonths} months of Dotabod Pro from gift subscriptions.`
      }
    }

    return null
  }

  // Use notification API instead of Alert component
  useEffect(() => {
    const key = `gift-notification-${Date.now()}`

    notification.success({
      message: "You've received a gift!",
      description: (
        <Space direction='vertical' size='small'>
          <Text>
            {senderName || 'Someone'} has gifted you {giftTypeDisplay}!
          </Text>
          {giftMessage && <Text italic>"{giftMessage}"</Text>}
          {totalNotifications > 1 && (
            <Text type='secondary'>You have {totalNotifications} unread gift notifications.</Text>
          )}
        </Space>
      ),
      icon: <GiftOutlined style={{ color: '#52c41a' }} />,
      duration: 0, // Don't auto-close
      key,
      onClose: onDismiss,
      placement: 'bottomLeft',
      className: 'gift-notification',
    })

    // Clean up notification when component unmounts
    return () => {
      notification.destroy(key)
    }
  }, [senderName, giftTypeDisplay, giftMessage, totalNotifications, notification])

  // Return null since we're using the notification API
  return null
}

export default GiftNotification
