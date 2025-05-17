import type { SettingKeys } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import type { ChatterSettingKeys } from '@/utils/subscription'
import { Slider, type SliderSingleProps } from 'antd'
import { useEffect, useState } from 'react'
import { TierBadge } from './TierBadge'

interface TierSliderProps extends Omit<SliderSingleProps, 'onChange'> {
  settingKey: SettingKeys | ChatterSettingKeys
  label?: React.ReactNode
  className?: string
  onChange?: (value: number) => void
  helpText?: string
  hideTierBadge?: boolean
  debounceMs?: number
}

export function TierSlider({
  settingKey,
  label,
  className,
  hideTierBadge,
  disabled: externalDisabled,
  value: externalValue,
  onChange: externalOnChange,
  helpText,
  debounceMs = 500, // Default debounce of 500ms
  ...sliderProps
}: TierSliderProps) {
  const { data: rawValue, updateSetting, tierAccess } = useUpdateSetting<number>(settingKey)
  const [localValue, setLocalValue] = useState<number>(externalValue ?? rawValue ?? 0)
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)

  const isDisabled = externalDisabled || !tierAccess.hasAccess

  // Update local value when external value changes
  useEffect(() => {
    if (externalValue !== undefined) {
      setLocalValue(externalValue)
    } else if (rawValue !== undefined) {
      setLocalValue(rawValue)
    }
  }, [externalValue, rawValue])

  const handleChange = (value: number) => {
    setLocalValue(value)

    // If external onChange is provided, call it immediately
    if (externalOnChange) {
      externalOnChange(value)
    } else {
      // Otherwise debounce the updateSetting call
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }

      const newTimeout = setTimeout(() => {
        updateSetting(value)
      }, debounceMs)

      setDebounceTimeout(newTimeout)
    }
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
    }
  }, [debounceTimeout])

  const sliderId = `slider-${settingKey}`

  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      {label && (
        <div className='flex items-center'>
          <label htmlFor={sliderId} className='block text-sm'>
            {label}
          </label>
          {!tierAccess.hasAccess && !hideTierBadge && (
            <span className='ml-2'>
              <TierBadge requiredTier={tierAccess.requiredTier} />
            </span>
          )}
        </div>
      )}
      <div className='py-2'>
        <Slider
          id={sliderId}
          value={localValue}
          onChange={handleChange}
          disabled={isDisabled}
          {...sliderProps}
        />
      </div>
      {helpText && <span className='block text-xs italic'>{helpText}</span>}
    </div>
  )
}
