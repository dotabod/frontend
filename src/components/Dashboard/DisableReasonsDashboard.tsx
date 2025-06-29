import { Badge, Card, Empty, Spin, Typography } from 'antd'
import { useDisableReasons } from '@/lib/hooks/useDisableReasons'
import { DisableReasonAlerts } from './DisableReasonAlert'

const { Title, Text } = Typography

export function DisableReasonsDashboard() {
  const { data, loading, unacknowledgedCount, unresolvedCount } = useDisableReasons()

  if (loading) {
    return (
      <Card>
        <div className='flex justify-center items-center py-8'>
          <Spin size='large' />
        </div>
      </Card>
    )
  }

  if (!data?.notifications?.length) {
    return (
      <Card>
        <Empty description='No disable notifications' image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    )
  }

  const unresolvedNotifications = data.notifications.filter((n) => !n.resolvedAt)
  const resolvedNotifications = data.notifications.filter((n) => n.resolvedAt)

  return (
    <div className='space-y-6'>
      {unresolvedNotifications.length > 0 && (
        <Card
          title={
            <div className='flex items-center gap-2'>
              <Title level={4} className='mb-0'>
                Active Disable Reasons
              </Title>
              {unacknowledgedCount > 0 && <Badge count={unacknowledgedCount} />}
            </div>
          }
        >
          <DisableReasonAlerts />
        </Card>
      )}

      {resolvedNotifications.length > 0 && (
        <Card
          title={
            <Title level={4} className='mb-0'>
              Resolved Issues
            </Title>
          }
        >
          <Text type='secondary' className='block mb-4'>
            These issues have been resolved:
          </Text>
          <div className='space-y-2'>
            {resolvedNotifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className='p-3 bg-gray-50 rounded border border-gray-200 opacity-60'
              >
                <div className='flex justify-between items-start'>
                  <div>
                    <Text strong>{notification.reason}</Text>
                    <Text className='block text-sm text-gray-600'>{notification.settingKey}</Text>
                  </div>
                  <Text className='text-sm text-gray-500'>
                    Resolved{' '}
                    {notification.resolvedAt
                      ? new Date(notification.resolvedAt).toLocaleDateString()
                      : 'Unknown'}
                  </Text>
                </div>
              </div>
            ))}
            {resolvedNotifications.length > 5 && (
              <Text type='secondary' className='block text-center'>
                And {resolvedNotifications.length - 5} more resolved issues...
              </Text>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

export function DisableReasonsBadge() {
  const { unacknowledgedCount, loading } = useDisableReasons()

  if (loading || unacknowledgedCount === 0) {
    return null
  }

  return <Badge count={unacknowledgedCount} size='small' />
}
