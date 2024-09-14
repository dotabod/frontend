import { Settings } from '@/lib/defaultSettings'
import { fetcher } from '@/lib/fetcher'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { App, Button } from 'antd'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import useSWR from 'swr'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'

export function DisableToggle() {
  const { data } = useSWR('/api/check-ban', fetcher)
  const { notification } = App.useApp()
  const user = useSession()?.data?.user

  const {
    data: isDotabodDisabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.commandDisable)

  const checkBanOrDisable = isDotabodDisabled || data?.banned

  useEffect(() => {
    if (isDotabodDisabled) {
      notification.open({
        key: 'dotabod-disabled',
        type: 'warning',
        duration: 0,
        placement: 'bottomLeft',
        message: 'Dotabod is currently disabled.',
        description:
          'Click the toggle to enable it. You will not receive any game events or commands until you do.',
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

  console.log(data?.banned)

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipContent>
          {!data?.banned && checkBanOrDisable
            ? 'Click to enable Dotabod and start responding to game events and commands again.'
            : 'Click to disable Dotabod and stop responding to game events and commands'}
        </TooltipContent>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2">
            <Switch
              id="disable-toggle"
              className="flex"
              disabled={!!data?.banned}
              checked={!checkBanOrDisable}
              onCheckedChange={(checked) => updateSetting(!checked)}
            />
            <Label
              htmlFor="disable-toggle"
              className="space-x-2 rounded flex flex-row items-center text-gray-300"
            >
              <span>
                Dotabod is {checkBanOrDisable ? 'disabled' : 'enabled'}
              </span>
            </Label>
          </div>
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  )
}
