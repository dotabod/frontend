import { Settings } from '@/lib/defaultSettings'
import { fetcher } from '@/lib/fetcher'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Switch, Tooltip } from 'antd'
import useSWR from 'swr'

export function CompactDisableToggle() {
  const { data } = useSWR('/api/check-ban', fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  const { data: isDotabodDisabled, updateSetting } = useUpdateSetting(Settings.commandDisable)

  const checkBanOrDisable = isDotabodDisabled || data?.banned

  return (
    <Tooltip title={!data?.banned && checkBanOrDisable ? 'Enable Dotabod' : 'Disable Dotabod'}>
      <Switch
        size='small'
        disabled={data?.banned}
        checked={!checkBanOrDisable}
        onChange={(checked) => updateSetting(!checked)}
      />
    </Tooltip>
  )
}
