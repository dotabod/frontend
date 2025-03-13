import type React from 'react'
import { Alert, Button, Space, Typography } from 'antd'
import { CloseOutlined } from '@ant-design/icons'

const { Text } = Typography

interface GiftNotificationProps {
  senderName: string
  giftMessage?: string
  giftType: 'monthly' | 'annual' | 'lifetime'
  onDismiss: () => void
}

const GiftNotification: React.FC<GiftNotificationProps> = ({
  senderName,
  giftMessage,
  giftType,
  onDismiss,
}) => {
  // Format the gift type for display
  const getGiftTypeDisplay = (type: 'monthly' | 'annual' | 'lifetime') => {
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

  const giftTypeDisplay = getGiftTypeDisplay(giftType)

  return (
    <Alert
      type='success'
      showIcon
      className='mb-4'
      message={
        <Space direction='vertical' size='small'>
          <div className='flex justify-between items-center'>
            <Text strong>You've received a gift!</Text>
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
        </Space>
      }
    />
  )
}

export default GiftNotification
