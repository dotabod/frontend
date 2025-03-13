import type React from 'react'
import { Alert, Button, Space, Typography, Badge } from 'antd'
import { CloseOutlined } from '@ant-design/icons'

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

  const totalGiftedMessage = getTotalGiftedMessage()

  return (
    <Alert
      type='success'
      showIcon
      className='mb-4'
      message={
        <Space direction='vertical' size='small'>
          <div className='flex justify-between items-center'>
            <div className='flex items-center'>
              <Text strong>You've received a gift!</Text>
              {totalNotifications > 1 && (
                <Badge
                  count={totalNotifications}
                  style={{ marginLeft: 8, backgroundColor: '#52c41a' }}
                  title={`You have ${totalNotifications} unread gift notifications`}
                />
              )}
            </div>
            <Button
              type='text'
              size='small'
              icon={<CloseOutlined />}
              onClick={onDismiss}
              aria-label='Dismiss notification'
            />
          </div>
          <Text>
            {senderName} has gifted you {giftTypeDisplay}!
          </Text>
          {giftMessage && <Text italic>"{giftMessage}"</Text>}

          {totalGiftedMessage && (
            <Paragraph className='mt-2 text-sm'>{totalGiftedMessage}</Paragraph>
          )}
        </Space>
      }
    />
  )
}

export default GiftNotification
