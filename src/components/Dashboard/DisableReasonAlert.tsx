import { CheckCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Space } from 'antd'
import { type DisableNotification, useDisableReasons } from '@/lib/hooks/useDisableReasons'

interface DisableReasonAlertProps {
  notification: DisableNotification
  onAcknowledge?: (id: string) => void
  onResolve?: (settingKey: string) => void
  showActions?: boolean
  compact?: boolean
}

export function DisableReasonAlert({
  notification,
  onAcknowledge,
  onResolve,
  showActions = true,
  compact = false,
}: DisableReasonAlertProps) {
  const { getDisableReasonExplanation } = useDisableReasons()

  const explanation = getDisableReasonExplanation(notification.reason, notification.metadata)

  const handleAcknowledge = () => {
    onAcknowledge?.(notification.id)
  }

  const handleResolve = () => {
    onResolve?.(notification.settingKey)
  }

  const getAlertType = () => {
    switch (explanation.severity) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'warning'
    }
  }

  const formatSettingName = (key: string) => {
    // Convert camelCase or snake_case to readable format
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim()
  }

  const actions = showActions ? (
    <Space>
      {!notification.acknowledged && (
        <Button size='small' icon={<CheckCircleOutlined />} onClick={handleAcknowledge}>
          Acknowledge
        </Button>
      )}
      {explanation.action && (
        <Button size='small' type='primary' onClick={handleResolve}>
          {explanation.action}
        </Button>
      )}
    </Space>
  ) : null

  const title = compact
    ? `${formatSettingName(notification.settingKey)}: ${explanation.title}`
    : explanation.title

  const description = compact ? (
    explanation.description
  ) : (
    <div>
      <p>
        <strong>Feature:</strong> {formatSettingName(notification.settingKey)}
      </p>
      <p>{explanation.description}</p>
      {notification.metadata?.additional_info && (
        <p>
          <em>{notification.metadata.additional_info}</em>
        </p>
      )}
      <p>
        <small>Disabled at: {new Date(notification.createdAt).toLocaleString()}</small>
      </p>
    </div>
  )

  return (
    <Alert
      type={getAlertType()}
      message={title}
      description={description}
      action={actions}
      closable={notification.acknowledged}
      icon={notification.acknowledged ? <CheckCircleOutlined /> : undefined}
      style={{
        marginBottom: compact ? 8 : 16,
        opacity: notification.acknowledged ? 0.7 : 1,
      }}
    />
  )
}

interface DisableReasonAlertsProps {
  settingKey?: string
  compact?: boolean
  maxItems?: number
}

export function DisableReasonAlerts({
  settingKey,
  compact = false,
  maxItems,
}: DisableReasonAlertsProps) {
  const { data, acknowledgeDisableReason, resolveDisableReason } = useDisableReasons()

  if (!data?.notifications?.length) {
    return null
  }

  let notifications = data.notifications.filter((n) => !n.resolvedAt)

  if (settingKey) {
    notifications = notifications.filter((n) => n.settingKey === settingKey)
  }

  if (maxItems) {
    notifications = notifications.slice(0, maxItems)
  }

  if (!notifications.length) {
    return null
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {notifications.map((notification) => (
        <DisableReasonAlert
          key={notification.id}
          notification={notification}
          onAcknowledge={acknowledgeDisableReason}
          onResolve={resolveDisableReason}
          compact={compact}
        />
      ))}
    </div>
  )
}
