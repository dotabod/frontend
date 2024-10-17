import { Settings } from '@/lib/defaultSettings'
import { fetcher } from '@/lib/fetcher'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useTrack } from '@/lib/track'
import { App, Button, Switch, Tooltip } from 'antd'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import useSWR from 'swr'

const Toggle = () => {
  const { data } = useSWR('/api/check-ban', fetcher)
  const {
    data: isDotabodDisabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.commandDisable)

  const checkBanOrDisable = isDotabodDisabled || data?.banned

  return (
    <Tooltip
      title={
        !data?.banned && checkBanOrDisable
          ? 'Click to enable Dotabod and start responding to game events and commands again.'
          : 'Click to disable Dotabod and stop responding to game events and commands'
      }
    >
      <label
        htmlFor="disable-toggle"
        className="cursor-pointer space-x-2 rounded flex flex-row items-center text-gray-300"
      >
        <Switch
          id="disable-toggle"
          loading={loading}
          className="flex"
          disabled={data?.banned}
          checked={!checkBanOrDisable}
          onChange={(checked) => updateSetting(!checked)}
        />
        <span className="text-clip text-nowrap">
          Dotabod is {checkBanOrDisable ? 'disabled' : 'enabled'}
        </span>
      </label>
    </Tooltip>
  )
}

export function DisableToggle() {
  const { data } = useSWR('/api/check-ban', fetcher)
  const { notification } = App.useApp()
  const user = useSession()?.data?.user
  const { data: settingsData } = useSWR('/api/settings', fetcher)
  const isLive = settingsData?.stream_online
  const track = useTrack()

  const { data: isDotabodDisabled } = useUpdateSetting(Settings.commandDisable)

  useEffect(() => {
    if (isLive) {
      notification.destroy('stream-offline')
    } else {
      notification.open({
        key: 'stream-offline',
        type: 'warning',
        duration: 0,
        placement: 'bottomLeft',
        message: 'Your stream is offline.',
        description:
          'Dotabod will only work once you start streaming and go online.',
      })
    }
  }, [isLive, notification])

  useEffect(() => {
    if (isDotabodDisabled) {
      notification.open({
        key: 'dotabod-disabled',
        type: 'warning',
        duration: 0,
        placement: 'bottomLeft',
        message: 'Dotabod is currently disabled.',
        description: (
          <div className="space-y-2">
            <span>
              Click the toggle to enable it. You will not receive any game
              events or commands until you do.
            </span>
            <Toggle />
          </div>
        ),
      })
    } else {
      notification.destroy('dotabod-disabled')
    }
  }, [isDotabodDisabled, notification])

  useEffect(() => {
    if (data?.banned) {
      notification.open({
        key: 'dotabod-banned',
        placement: 'bottomLeft',
        type: 'error',
        duration: 0,
        message: 'Dotabod is disabled because you banned it from the channel.',
        description: user?.name && (
          <span>
            <Button
              type="link"
              onClick={() => {
                window.open(
                  `https://www.twitch.tv/popout/${user?.name}/viewercard/dotabod?popout=`,
                  'mywindow',
                  'menubar=1,resizable=1,width=350,height=250'
                )
              }}
              target="_blank"
            >
              Click here
            </Button>
            <span>to unban Dotabod</span>
          </span>
        ),
      })
    } else {
      notification.destroy('dotabod-banned')
    }
  }, [data?.banned, notification, user?.name])

  return <Toggle />
}
