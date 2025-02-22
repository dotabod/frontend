import { Switch } from 'antd'
import { TierBadge } from './TierBadge'
import type { SettingKeys } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import type { ChatterSettingKeys } from '@/utils/subscription'

interface TierSwitchProps {
  settingKey: SettingKeys | ChatterSettingKeys
  label?: React.ReactNode
  className?: string
  disabled?: boolean
  checked?: boolean
  onChange?: (checked: boolean) => void
}

export function TierSwitch({
  settingKey,
  label,
  className,
  disabled: externalDisabled,
  checked: externalChecked,
  onChange: externalOnChange,
}: TierSwitchProps) {
  const {
    data: enabled,
    updateSetting,
    tierAccess,
  } = useUpdateSetting(settingKey)

  const isDisabled = externalDisabled || !tierAccess.hasAccess
  const isChecked = externalChecked ?? enabled
  const handleChange = externalOnChange ?? updateSetting

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Switch
        checked={isChecked}
        onChange={handleChange}
        disabled={isDisabled}
      />
      {label && <span>{label}</span>}
      {!tierAccess.hasAccess && (
        <TierBadge requiredTier={tierAccess.requiredTier} />
      )}
    </div>
  )
}
