import type { SettingKeys } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import type { ChatterSettingKeys } from '@/utils/subscription'
import { Switch } from 'antd'
import { TierBadge } from './TierBadge'

interface TierSwitchProps {
  settingKey: SettingKeys | ChatterSettingKeys
  label?: React.ReactNode
  className?: string
  disabled?: boolean
  checked?: boolean
  onChange?: (checked: boolean) => void
  hideTierBadge?: boolean
}

export function TierSwitch({
  settingKey,
  label,
  className,
  disabled: externalDisabled,
  checked: externalChecked,
  onChange: externalOnChange,
  hideTierBadge,
}: TierSwitchProps) {
  const { data: enabled, updateSetting, tierAccess } = useUpdateSetting(settingKey)

  const isDisabled = externalDisabled || !tierAccess.hasAccess
  const isChecked = externalChecked ?? enabled
  const handleChange = externalOnChange ?? updateSetting
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className='flex items-center gap-2 flex-nowrap'>
        <Switch checked={isChecked} onChange={handleChange} disabled={isDisabled} />
        {!hideTierBadge && <TierBadge requiredTier={tierAccess.requiredTier} />}
        {label && <span className='flex-1'>{label}</span>}
      </div>
    </div>
  )
}
