import type { DisableReason } from '@prisma/client'
import { useCallback } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

export interface DisableNotification {
  id: string
  userId: string
  settingKey: string
  reason: string
  metadata?: any
  createdAt: string
  acknowledged: boolean
  resolvedAt?: string
  autoResolved: boolean
}

export interface DisabledSetting {
  key: string
  disableReason: string
  autoDisabledAt: string
  autoDisabledBy: string
  disableMetadata?: any
}

export interface DisableReasonsData {
  notifications: DisableNotification[]
  disabledSettings: DisabledSetting[]
}

export function useDisableReasons() {
  const { data, error, mutate } = useSWR<DisableReasonsData>(
    '/api/settings/disable-reasons',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
    },
  )

  const acknowledgeDisableReason = useCallback(
    async (notificationId: string) => {
      try {
        const response = await fetch('/api/settings/acknowledge-disable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notificationId }),
        })

        if (!response.ok) {
          throw new Error('Failed to acknowledge disable reason')
        }

        // Optimistically update the data
        if (data) {
          mutate(
            {
              ...data,
              notifications: data.notifications.map((notification) =>
                notification.id === notificationId
                  ? { ...notification, acknowledged: true }
                  : notification,
              ),
            },
            false,
          )
        }

        return true
      } catch (error) {
        console.error('Failed to acknowledge disable reason:', error)
        return false
      }
    },
    [data, mutate],
  )

  const resolveDisableReason = useCallback(
    async (settingKey: string, autoResolved = false) => {
      try {
        const response = await fetch('/api/settings/resolve-disable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ settingKey, autoResolved }),
        })

        if (!response.ok) {
          throw new Error('Failed to resolve disable reason')
        }

        // Optimistically update the data
        if (data) {
          const now = new Date().toISOString()
          mutate(
            {
              notifications: data.notifications.map((notification) =>
                notification.settingKey === settingKey
                  ? { ...notification, resolvedAt: now, autoResolved }
                  : notification,
              ),
              disabledSettings: data.disabledSettings.filter(
                (setting) => setting.key !== settingKey,
              ),
            },
            false,
          )
        }

        return true
      } catch (error) {
        console.error('Failed to resolve disable reason:', error)
        return false
      }
    },
    [data, mutate],
  )

  const getDisableReasonExplanation = useCallback((reason: DisableReason, metadata?: any) => {
    switch (reason) {
      case 'TOKEN_REVOKED':
        return {
          title: 'App permissions revoked',
          description:
            "You removed Dotabod's access to your Twitch account. Please reconnect to restore functionality.",
          action: 'Reconnect your Twitch account',
          severity: 'high' as const,
        }

      case 'MANUAL_DISABLE':
        return {
          title: 'Manually disabled',
          description: `Dotabod was disabled by ${metadata?.disabled_by || 'a moderator'} using the ${metadata?.command || '!disable'} command.`,
          action: 'Use !enable command to re-enable',
          severity: 'medium' as const,
        }

      case 'STREAM_OFFLINE':
        return {
          title: 'Stream is offline',
          description: 'This feature only works when you are streaming live on Twitch.',
          action: 'Start streaming to re-enable',
          severity: 'low' as const,
        }

      case 'CHAT_PERMISSION_DENIED':
        return {
          title: 'Chat permission denied',
          description:
            metadata?.drop_reason === 'followers_only_mode'
              ? 'Dotabod cannot send messages because your channel is in followers-only mode and the bot is not a moderator.'
              : 'Dotabod lacks the necessary permissions to send chat messages.',
          action: 'Make Dotabod a moderator or disable followers-only mode',
          severity: 'high' as const,
        }

      case 'SUBSCRIPTION_INSUFFICIENT':
        return {
          title: 'Subscription required',
          description: `This feature requires a ${metadata?.required_tier || 'Pro'} subscription. Your current tier is ${metadata?.current_tier || 'Free'}.`,
          action: `Upgrade to ${metadata?.required_tier || 'Pro'}`,
          severity: 'medium' as const,
        }

      case 'API_ERROR':
        return {
          title: 'API error occurred',
          description: `Failed to communicate with ${metadata?.api_endpoint || 'external service'}: ${metadata?.error_message || 'Unknown error'}`,
          action: 'Contact support if this persists',
          severity: 'medium' as const,
        }

      case 'INVALID_TOKEN':
        return {
          title: 'Authentication expired',
          description: 'Your Twitch authentication has expired and needs to be refreshed.',
          action: 'Refresh your connection in settings',
          severity: 'high' as const,
        }

      case 'BOT_BANNED':
        return {
          title: 'Bot is banned',
          description: 'The Dotabod bot has been banned from your Twitch channel.',
          action: 'Unban the Dotabod bot in your Twitch moderation settings',
          severity: 'high' as const,
        }

      default:
        return {
          title: 'Feature disabled',
          description: 'This feature has been automatically disabled.',
          action: 'Check your settings or contact support',
          severity: 'medium' as const,
        }
    }
  }, [])

  return {
    data,
    loading: !error && !data,
    error,
    mutate,
    acknowledgeDisableReason,
    resolveDisableReason,
    getDisableReasonExplanation,
    unacknowledgedCount:
      data?.notifications.filter((n) => !n.acknowledged && !n.resolvedAt).length ?? 0,
    unresolvedCount: data?.notifications.filter((n) => !n.resolvedAt).length ?? 0,
  }
}
