import type { App } from 'antd'
import { useEffect, useRef } from 'react'

const OFFLINE_SETTINGS_REFRESH_MS = 30_000

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
  refreshSettings: () => void,
) => {
  const refreshSettingsRef = useRef(refreshSettings)

  useEffect(() => {
    refreshSettingsRef.current = refreshSettings
  }, [refreshSettings])

  useEffect(() => {
    if (streamOnline === false) {
      notification.open({
        description: <StreamOfflineMessage />,
        duration: 0,
        key: 'stream-offline',
        message: 'Twitch stream is offline',
        placement: 'bottomLeft',
        type: 'error',
      })

      const refreshTimer = window.setInterval(() => {
        refreshSettingsRef.current()
      }, OFFLINE_SETTINGS_REFRESH_MS)

      return () => {
        window.clearInterval(refreshTimer)
      }
    }

    notification.destroy('stream-offline')
  }, [streamOnline, notification])
}
