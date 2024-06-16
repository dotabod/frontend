import CommandDetail from '@/components/Dashboard/CommandDetail'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Switch, Tooltip } from 'antd'

export function DisableToggle() {
  const {
    data: isDotabodDisabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.commandDisable)

  return (
    <Tooltip placement="right" title={CommandDetail.commandDisable.description}>
      <label
        htmlFor="disable-toggle"
        className="cursor-pointer space-x-2 rounded text-xs text-gray-300"
      >
        <Switch
          id="disable-toggle"
          loading={loading}
          size="small"
          className="flex"
          checked={!isDotabodDisabled}
          onChange={(checked) => updateSetting(!checked)}
        />
        <span>Dotabod is {isDotabodDisabled ? 'disabled' : 'enabled'}</span>
      </label>
    </Tooltip>
  )
}
