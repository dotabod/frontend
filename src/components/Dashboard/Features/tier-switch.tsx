import { Switch } from 'antd'
import { useId } from 'react'

import type { SettingKeys } from '@/lib/default-settings'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import type { ChatterSettingKeys } from '@/utils/subscription'

import { TierBadge } from './tier-badge'

interface TierSwitchProps {
  settingKey: SettingKeys | ChatterSettingKeys
  label?: React.ReactNode
  className?: string
  disabled?: boolean
  checked?: boolean
  onChange?: (checked: boolean) => void
  hideTierBadge?: boolean
}

export const TierSwitch = ({
  settingKey,
  label,
  className,
  disabled: externalDisabled,
  checked: externalChecked,
  onChange: externalOnChange,
  hideTierBadge,
}: TierSwitchProps) => {
  const labelId = useId()
  const { data: enabled, updateSetting, tierAccess, isSaving } = useUpdateSetting(settingKey)

  // isSaving only reflects mutations driven by the internal updateSetting. When
  // the parent owns the change handler, the parent also owns the saving signal.
  const usingInternalMutation = !externalOnChange
  const reflectSaving = usingInternalMutation && isSaving
  const isDisabled = externalDisabled || !tierAccess.hasAccess || reflectSaving
  const isChecked = externalChecked ?? enabled
  const handleChange = externalOnChange ?? updateSetting
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className='flex flex-nowrap items-center gap-2'>
        <Switch
          aria-labelledby={label ? labelId : undefined}
          checked={isChecked}
          onChange={handleChange}
          disabled={isDisabled}
          loading={reflectSaving}
        />
        {!hideTierBadge && <TierBadge requiredTier={tierAccess.requiredTier} />}
        {label && (
          <span id={labelId} className='flex-1'>
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
