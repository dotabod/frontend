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
) => {
  useEffect(() => {
    if (streamOnline === false) {
      notification.open({
        key: 'stream-offline',
        type: 'error',
        duration: 0,
        placement: 'bottomLeft',
        message: 'Twitch stream is offline',
        description: <StreamOfflineMessage />,
      })
    } else {
      notification.destroy('stream-offline')
    }
  }, [streamOnline, notification])
}
