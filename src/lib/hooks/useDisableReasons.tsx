import type { DisableReason } from '@prisma/client'
import { useCallback } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { STABLE_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'

interface DisableNotification {
  id: string
  userId: string
  settingKey: string
  reason: string
  metadata?: Record<string, unknown>
  createdAt: string
  acknowledged: boolean
  resolvedAt?: string
  autoResolved: boolean
}

interface DisabledSetting {
  key: string
  disableReason: string
  autoDisabledAt: string
  autoDisabledBy: string
  disableMetadata?: Record<string, unknown>
}

export interface DisableReasonsData {
  notifications: DisableNotification[]
  disabledSettings: DisabledSetting[]
}

export function useDisableReasons() {
  const { data, error, mutate } = useSWR<DisableReasonsData>(
    '/api/settings/disable-reasons',
    fetcher,
    STABLE_SWR_OPTIONS,
  )

  const acknowledgeDisableReason = useCallback(
    async (notificationId: string) => {
      try {
        const response = await fetch('/api/settings/acknowledge-disable', {
          body: JSON.stringify({ notificationId }),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
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
          body: JSON.stringify({ autoResolved, settingKey }),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to resolve disable reason')
        }

        // Optimistically update the data
        if (data) {
          const now = new Date().toISOString()
          mutate(
            {
              disabledSettings: data.disabledSettings.filter(
                (setting) => setting.key !== settingKey,
              ),
              notifications: data.notifications.map((notification) =>
                notification.settingKey === settingKey
                  ? { ...notification, autoResolved, resolvedAt: now }
                  : notification,
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

  const getDisableReasonExplanation = useCallback(
    (reason: DisableReason, metadata?: Record<string, unknown>) => {
      switch (reason) {
        case 'TOKEN_REVOKED': {
          return {
            action: 'Reconnect your Twitch account',
            description:
              "You removed Dotabod's access to your Twitch account. Please reconnect to restore functionality.",
            severity: 'high' as const,
            title: 'App permissions revoked',
          }
        }

        case 'MANUAL_DISABLE': {
          return {
            action: 'Use !enable command to re-enable',
            description: `Dotabod was disabled by ${metadata?.disabled_by || 'a moderator'} using the ${metadata?.command || '!disable'} command.`,
            severity: 'medium' as const,
            title: 'Manually disabled',
          }
        }

        case 'STREAM_OFFLINE': {
          return {
            action: 'Start streaming to re-enable',
            description: 'This feature only works when you are streaming live on Twitch.',
            severity: 'low' as const,
            title: 'Stream is offline',
          }
        }

        case 'CHAT_PERMISSION_DENIED': {
          return {
            action:
              metadata?.drop_reason === 'followers_only_mode'
                ? 'Make Dotabod a moderator or disable followers-only mode'
                : metadata?.drop_reason === 'user_warned'
                  ? 'The Dotabod bot account needs to acknowledge its warning in your Twitch channel'
                  : metadata?.drop_reason === 'banned_phone_alias'
                    ? "Unban the Dotabod bot's phone number in your Twitch channel moderation settings"
                    : 'Check your channel settings and ensure Dotabod has proper permissions',
            description:
              metadata?.drop_reason === 'followers_only_mode'
                ? 'Dotabod cannot send messages because your channel is in followers-only mode and the bot is not a moderator.'
                : metadata?.drop_reason === 'user_warned'
                  ? 'Dotabod cannot send messages because the bot account is currently warned and must acknowledge the warning first.'
                  : metadata?.drop_reason === 'banned_phone_alias'
                    ? "Dotabod cannot send messages because the bot's phone number is banned from your channel."
                    : `Dotabod cannot send messages due to: ${metadata?.drop_reason_message || 'chat permission restrictions'}.`,
            severity: 'high' as const,
            title: 'Chat permission denied',
          }
        }

        case 'SUBSCRIPTION_INSUFFICIENT': {
          return {
            action: `Upgrade to ${metadata?.required_tier || 'Pro'}`,
            description: `This feature requires a ${metadata?.required_tier || 'Pro'} subscription. Your current tier is ${metadata?.current_tier || 'Free'}.`,
            severity: 'medium' as const,
            title: 'Subscription required',
          }
        }

        case 'API_ERROR': {
          return {
            action: 'Contact support if this persists',
            description: `Failed to communicate with ${metadata?.api_endpoint || 'external service'}: ${metadata?.error_message || 'Unknown error'}`,
            severity: 'medium' as const,
            title: 'API error occurred',
          }
        }

        case 'INVALID_TOKEN': {
          return {
            action: 'Refresh your connection in settings',
            description: 'Your Twitch authentication has expired and needs to be refreshed.',
            severity: 'high' as const,
            title: 'Authentication expired',
          }
        }

        case 'BOT_BANNED': {
          return {
            action: 'Unban the Dotabod bot in your Twitch moderation settings',
            description: 'The Dotabod bot has been banned from your Twitch channel.',
            severity: 'high' as const,
            title: 'Bot is banned',
          }
        }

        case 'ACCOUNT_SHARING': {
          return {
            action:
              'Use !clearsharing to reset, but ensure only one person has the Dotabod GSI config file',
            description: metadata?.blocked_steam32_id
              ? `Multiple people are using Dotabod GSI files for this stream. Steam account "${metadata?.account_name || 'Unknown'}" was blocked to prevent conflicts. Only the first account per stream is allowed.`
              : 'Multiple Steam accounts are sending game data to this stream. Additional accounts are blocked to prevent conflicts.',
            severity: 'high' as const,
            title: 'Multiple Steam accounts detected',
          }
        }

        default: {
          return {
            action: 'Check your settings or contact support',
            description: 'This feature has been automatically disabled.',
            severity: 'medium' as const,
            title: 'Feature disabled',
          }
        }
      }
    },
    [],
  )

  return {
    acknowledgeDisableReason,
    data,
    error,
    getDisableReasonExplanation,
    loading: !error && !data,
    mutate,
    resolveDisableReason,
    unacknowledgedCount:
      data?.notifications.filter((n) => !n.acknowledged && !n.resolvedAt).length ?? 0,
    unresolvedCount: data?.notifications.filter((n) => !n.resolvedAt).length ?? 0,
  }
}
