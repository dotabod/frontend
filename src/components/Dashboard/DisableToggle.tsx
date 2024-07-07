import { Settings } from '@/lib/defaultSettings'
import { fetcher } from '@/lib/fetcher'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { App, Button, Switch, Tooltip } from 'antd'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import useSWR from 'swr'

export function DisableToggle() {
  const { data } = useSWR('/api/check-ban', fetcher)
  const { message } = App.useApp()
  const user = useSession()?.data?.user

  const {
    data: isDotabodDisabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.commandDisable)

  const checkBanOrDisable = isDotabodDisabled || data?.banned

  useEffect(() => {
    if (isDotabodDisabled) {
      message.open({
        key: 'dotabod-disabled',
        type: 'warning',
        duration: 0,
        content: (
          <span>
            Dotabod is currently disabled. Click the toggle to enable it.
          </span>
        ),
      })
    } else {
      message.destroy('dotabod-disabled')
    }
  }, [isDotabodDisabled, message])

  useEffect(() => {
    if (data?.banned) {
      message.open({
        key: 'dotabod-banned',
        type: 'error',
        duration: 0,
        content: (
          <span>
            Dotabod is disabled because you banned it from the channel.
            {user?.name && (
              <>
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
                to unban Dotabod
              </>
            )}
          </span>
        ),
      })
    } else {
      message.destroy('dotabod-banned')
    }
  }, [data?.banned, message, user?.name])

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
