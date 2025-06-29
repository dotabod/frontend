import { InputNumber, type InputNumberProps } from 'antd'
import type { SettingKeys } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import type { ChatterSettingKeys } from '@/utils/subscription'
import { TierBadge } from './TierBadge'

interface TierNumberProps extends Omit<InputNumberProps, 'onChange'> {
  settingKey: SettingKeys | ChatterSettingKeys
  label?: React.ReactNode
  className?: string
  onChange?: (value: number | null) => void
  helpText?: string
  hideTierBadge?: boolean
}

export function TierNumber({
  settingKey,
  label,
  className,
  hideTierBadge,
  disabled: externalDisabled,
  value: externalValue,
  onChange: externalOnChange,
  helpText,
  ...inputProps
}: TierNumberProps) {
  const { data: rawValue, updateSetting, tierAccess } = useUpdateSetting<number>(settingKey)

  const isDisabled = externalDisabled || !tierAccess.hasAccess
  const numberValue = externalValue ?? rawValue

  const handleChange = (value: number | null) => {
    if (externalOnChange) {
      externalOnChange(value)
    } else {
      if (typeof value === 'number') updateSetting(value)
    }
  }

  const inputId = `input-${settingKey}`

  return (
    <div className={`space-y-1 ${className ?? ''}`}>
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
      <InputNumber
        id={inputId}
        value={numberValue}
        onChange={handleChange}
        disabled={isDisabled}
        {...inputProps}
      />
      {helpText && <span className='block text-xs italic'>{helpText}</span>}
    </div>
  )
}
