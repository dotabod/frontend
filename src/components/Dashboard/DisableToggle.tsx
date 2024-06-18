import CommandDetail from '@/components/Dashboard/CommandDetail'
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
    if (data?.banned) {
      message.open({
        key: 'dotabod-banned',
        type: 'error',
        duration: 0,
        content: (
          <span>
            Dotabod is disabled because you banned it from the channel.
            <Button
              size="small"
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
          </span>
        ),
      })
    } else {
      message.destroy('dotabod-banned')
    }
  }, [data?.banned, message, user?.name])

  return (
    <Tooltip
      placement="right"
      title={!data?.banned && CommandDetail.commandDisable.description}
    >
      <label
        htmlFor="disable-toggle"
        className="cursor-pointer space-x-2 rounded text-xs text-gray-300"
      >
        <Switch
          id="disable-toggle"
          loading={loading}
          size="small"
          className="flex"
          disabled={data?.banned}
          checked={!checkBanOrDisable}
          onChange={(checked) => updateSetting(!checked)}
        />
        <span>Dotabod is {checkBanOrDisable ? 'disabled' : 'enabled'}</span>
      </label>
    </Tooltip>
  )
}
