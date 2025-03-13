import { useEffect, useState } from 'react'
import { fetcher } from '@/lib/fetcher'
import useSWR from 'swr'
import GiftSubscriptionAlert from './GiftSubscriptionAlert'

interface GiftNotification {
  id: string
  senderName: string
  giftType: string
  giftQuantity: number
  giftMessage: string
  createdAt: string
}

interface GiftAlertProps {
  userId?: string
}

export const GiftAlert = ({ userId }: GiftAlertProps) => {
  const [activeNotification, setActiveNotification] = useState<GiftNotification | null>(null)
  const [pollingInterval, setPollingInterval] = useState<number>(5000) // 5 seconds by default

  // Use SWR to poll for new notifications
  const { data, error, mutate } = useSWR(userId ? '/api/overlay/gift-alert' : null, fetcher, {
    refreshInterval: pollingInterval,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  })

  // Handle notification display
  useEffect(() => {
    if (data?.hasNotification && !activeNotification) {
      setActiveNotification(data.notification)

      // Slow down polling when displaying a notification
      setPollingInterval(30000) // 30 seconds

      // Mark the notification as read
      fetch('/api/overlay/gift-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: data.notification.id,
        }),
      }).catch(console.error)
    }
  }, [data, activeNotification])

  // Handle notification dismissal
  const handleDismiss = () => {
    setActiveNotification(null)

    // Resume faster polling after dismissal
    setPollingInterval(5000)

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
