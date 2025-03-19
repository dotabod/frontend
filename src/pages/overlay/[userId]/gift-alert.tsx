import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import GiftSubscriptionAlert from '@/components/Overlay/GiftAlert/GiftSubscriptionAlert'
import Head from 'next/head'
import { fetcher } from '@/lib/fetcher'
import useSWR from 'swr'

interface GiftNotification {
  id: string
  senderName: string
  giftType: string
  giftQuantity: number
  giftMessage: string
  createdAt: string
}

export default function GiftAlertOverlay() {
  const router = useRouter()
  const { userId } = router.query
  const [activeNotification, setActiveNotification] = useState<GiftNotification | null>(null)
  const [pollingInterval, setPollingInterval] = useState<number>(5000) // 5 seconds by default

  // Use SWR to poll for new notifications
  const { data, error, mutate } = useSWR(
    userId ? `/api/overlay/gift-alert?id=${userId}` : null,
    fetcher,
    {
      refreshInterval: pollingInterval,
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    },
  )

  // Handle notification display
  useEffect(() => {
    if (data?.hasNotification && !activeNotification && data?.notification?.id) {
      const currentNotification = data.notification
      setActiveNotification(currentNotification)

      // Slow down polling when displaying a notification
      setPollingInterval(30000) // 30 seconds

      // Mark the notification as read
      fetch('/api/overlay/gift-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: currentNotification.id,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to mark notification as read')
          }
          return response.json()
        })
        .then(() => {
          // Force revalidate the data to prevent the same notification from appearing again
          mutate(
            (prev) => ({
              ...prev,
              hasNotification: false,
              notification: null,
            }),
            false, // Don't revalidate from the server immediately
          )
        })
        .catch((error) => {
          console.error('Error marking notification as read:', error)
        })
    }
  }, [data, activeNotification, mutate])

  // Handle notification dismissal
  const handleDismiss = () => {
    setActiveNotification(null)

    // Resume faster polling after dismissal
    setPollingInterval(5000)

    // Revalidate to check for new notifications
    mutate()
  }

  return (
    <>
      <Head>
        <title>Gift Alert Overlay</title>
        <style jsx global>{`
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background-color: transparent;
          }
        `}</style>
      </Head>

      {activeNotification && (
        <GiftSubscriptionAlert
          senderName={activeNotification.senderName}
          giftType={activeNotification.giftType}
          giftQuantity={activeNotification.giftQuantity}
          giftMessage={activeNotification.giftMessage}
          onComplete={handleDismiss}
        />
      )}
    </>
  )
}
