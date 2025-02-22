import { Input, type InputProps } from 'antd'
import { TierBadge } from './TierBadge'
import type { SettingKeys } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import type { ChatterSettingKeys } from '@/utils/subscription'

interface TierInputProps extends Omit<InputProps, 'onChange'> {
  settingKey: SettingKeys | ChatterSettingKeys
  label?: React.ReactNode
  className?: string
  onChange?: (value: string) => void
  helpText?: string
}

export function TierInput({
  settingKey,
  label,
  className,
  disabled: externalDisabled,
  value: externalValue,
  onChange: externalOnChange,
  helpText,
  ...inputProps
}: TierInputProps) {
  const {
    data: value,
    updateSetting,
    tierAccess,
  } = useUpdateSetting(settingKey)

  const isDisabled = externalDisabled || !tierAccess.hasAccess
  const inputValue = externalValue ?? value
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (externalOnChange) {
      externalOnChange(newValue)
    } else {
      updateSetting(newValue)
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm">
          {label}
          {!tierAccess.hasAccess && (
            <TierBadge requiredTier={tierAccess.requiredTier} />
          )}
        </label>
      )}
      <Input
        value={inputValue}
        onChange={handleChange}
        disabled={isDisabled}
        {...inputProps}
      />
      {helpText && <span className="block text-xs italic">{helpText}</span>}
    </div>
  )
}
