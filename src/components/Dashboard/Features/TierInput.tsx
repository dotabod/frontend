import { Input, type InputProps } from 'antd'
import type { SettingKeys } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import type { ChatterSettingKeys } from '@/utils/subscription'
import { TierBadge } from './TierBadge'

interface TierInputProps extends Omit<InputProps, 'onChange'> {
  settingKey: SettingKeys | ChatterSettingKeys
  label?: React.ReactNode
  className?: string
  onChange?: (value: string) => void
  helpText?: string
  hideTierBadge?: boolean
}

export function TierInput({
  settingKey,
  label,
  hideTierBadge,
  className,
  disabled: externalDisabled,
  value: externalValue,
  onChange: externalOnChange,
  helpText,
  ...inputProps
}: TierInputProps) {
  const { data: rawValue, updateSetting, tierAccess } = useUpdateSetting<string>(settingKey)

  const isDisabled = externalDisabled || !tierAccess.hasAccess
  const inputValue = (externalValue ?? rawValue)?.toString() || ''
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (externalOnChange) {
      externalOnChange(newValue)
    } else {
      updateSetting(newValue)
    }
  }

  const inputId = `input-${settingKey}`

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={inputId} className='block text-sm'>
          {label}
          {!tierAccess.hasAccess && !hideTierBadge && (
            <span className='ml-2'>
              <TierBadge requiredTier={tierAccess.requiredTier} />
            </span>
          )}
        </label>
      )}
      <Input
        id={inputId}
        value={inputValue}
        onChange={handleChange}
        disabled={isDisabled}
        {...inputProps}
      />
      {helpText && <span className='block text-xs italic'>{helpText}</span>}
    </div>
  )
}
