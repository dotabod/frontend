import { Settings } from '@/lib/defaultSettings'
import { fetcher } from '@/lib/fetcher'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { App, Button, Tooltip } from 'antd'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import useSWR from 'swr'
import { TierSwitch } from './Features/TierSwitch'

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
      <TierSwitch
        hideTierBadge
        settingKey={Settings.commandDisable}
        label={`Dotabod is ${checkBanOrDisable ? 'disabled' : 'enabled'}`}
        disabled={data?.banned}
        checked={!checkBanOrDisable}
        onChange={(checked) => updateSetting(!checked)}
      />
    </Tooltip>
  )
}

export function DisableToggle() {
  const { data } = useSWR('/api/check-ban', fetcher)
  const { notification } = App.useApp()
  const user = useSession()?.data?.user
  const { data: settingsData } = useSWR('/api/settings', fetcher)
  const isLive = settingsData?.stream_online

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
        description: 'Dotabod will only work once you start streaming and go online.',
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
          <div className='space-y-2'>
            <span>
              Click the toggle to enable it. You will not receive any game events or commands until
              you do.
            </span>
            <Toggle />
          </div>
        ),
      })
    } else {
      notification.destroy('dotabod-disabled')
    }
  }, [isDotabodDisabled, notification])

  const botuser = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 'dotabod' : 'dotabod_test'

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
              type='link'
              onClick={() => {
                window.open(
                  `https://www.twitch.tv/popout/${user?.name}/viewercard/${botuser}?popout=`,
                  'mywindow',
                  'menubar=1,resizable=1,width=350,height=250',
                )
              }}
              target='_blank'
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
