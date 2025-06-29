import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import GiftSubscriptionAlert from './GiftSubscriptionAlert'

interface GiftNotification {
  id: string
  senderName: string
  giftType: string
  giftQuantity: number
  giftMessage: string
  createdAt: string
}

export const GiftAlert = () => {
  const [activeNotification, setActiveNotification] = useState<GiftNotification | null>(null)
  const [pollingInterval, setPollingInterval] = useState<number>(15000) // Changed from 5000 to 15000 (15 seconds)
  const router = useRouter()
  const { userId } = router.query

  // Use SWR to poll for new notifications with improved configuration
  const { data, error, mutate } = useSWR(
    userId ? `/api/overlay/gift-alert?id=${userId}` : null,
    fetcher,
    {
      refreshInterval: pollingInterval,
      revalidateOnFocus: false,
      dedupingInterval: pollingInterval, // Match deduping interval to polling interval
      focusThrottleInterval: 10000, // 10 seconds
      loadingTimeout: 8000, // 8 seconds
      errorRetryInterval: 5000, // 5 seconds
      errorRetryCount: 3,
      refreshWhenHidden: false, // Don't refresh when tab is hidden
      revalidateIfStale: false, // Don't revalidate stale data automatically
      revalidateOnReconnect: false, // Don't revalidate on reconnect
    },
  )

  // Handle notification display
  useEffect(() => {
    if (data?.hasNotification && !activeNotification && data?.notification?.id) {
      setActiveNotification(data.notification)

      // Slow down polling when displaying a notification
      setPollingInterval(30000) // 30 seconds

      // Mark the notification as read
      fetch(`/api/overlay/gift-alert?id=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: data.notification.id,
        }),
      }).catch(console.error)
    }
  }, [data, activeNotification, userId])

  // Handle notification dismissal
  const handleDismiss = () => {
    setActiveNotification(null)

    // Resume faster polling after dismissal
    setPollingInterval(15000) // Changed from 5000 to 15000 (15 seconds)

    // Revalidate to check for new notifications
    mutate()
  }

  if (!activeNotification) return null

  return (
    <GiftSubscriptionAlert
      senderName={activeNotification.senderName}
      giftType={activeNotification.giftType}
      giftQuantity={activeNotification.giftQuantity}
      giftMessage={activeNotification.giftMessage}
      onComplete={handleDismiss}
    />
  )
}
