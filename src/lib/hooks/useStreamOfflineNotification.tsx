import type { App } from 'antd'
import { useEffect } from 'react'

const StreamOfflineMessage = () => (
  <div>
    <div>
      Dotabod is disabled until you go live on Twitch. Not streaming on Twitch? Type !online in your
      Twitch chat to enable Dotabod.
    </div>
    <div className='mt-2 text-sm'>
      Note: Steam account connection also requires your stream to be online.
    </div>
  </div>
)

export const useStreamOfflineNotification = (
  streamOnline: boolean | undefined,
  notification: ReturnType<typeof App.useApp>['notification'],
  onRefresh?: () => void,
) => {
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout | null = null

    if (streamOnline === false) {
      notification.open({
        key: 'stream-offline',
        type: 'error',
        duration: 0,
        placement: 'bottomLeft',
        message: 'Twitch stream is offline',
        description: <StreamOfflineMessage />,
      })

      // Refresh settings every 5 minutes to check if stream is online
      refreshTimeout = setTimeout(() => {
        onRefresh?.()
      }, 300000)
    } else {
      notification.destroy('stream-offline')
      if (refreshTimeout) {
        clearTimeout(refreshTimeout)
      }
    }

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout)
      }
    }
  }, [streamOnline, notification, onRefresh])
}
