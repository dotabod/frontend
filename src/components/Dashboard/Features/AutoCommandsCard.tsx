import { Checkbox, Spin } from 'antd'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { TierSwitch } from './TierSwitch'

const AUTO_COMMAND_OPTIONS = [
  { command: '!np', key: 'commandNP', label: 'Notable Players' },
  { command: '!smurfs', key: 'commandSmurfs', label: 'Smurfs Check' },
  { command: '!gm', key: 'commandGM', label: 'Game Mode' },
  { command: '!lg', key: 'commandLG', label: 'Last Game' },
  { command: '!avg', key: 'commandAvg', label: 'Average Stats' },
] as const

export const AutoCommandsCard = () => {
  const {
    data: selectedCommands,
    loading,
    updateSetting,
  } = useUpdateSetting<string[]>(Settings.autoCommandsOnMatchStart)

  const [isEnabled, setIsEnabled] = useState(false)
  const [localSelected, setLocalSelected] = useState<string[]>([])

  // Initialize local state when data is loaded
  useEffect(() => {
    if (selectedCommands) {
      setIsEnabled(selectedCommands.length > 0)
      setLocalSelected(selectedCommands)
    }
  }, [selectedCommands])

  const handleCommandToggle = (commandKey: string, checked: boolean) => {
    const newSelected = checked
      ? [...localSelected, commandKey]
      : localSelected.filter((key) => key !== commandKey)

    setLocalSelected(newSelected)
    updateSetting(newSelected)
  }

  const handleEnableToggle = (enabled: boolean) => {
    setIsEnabled(enabled)
    if (!enabled) {
      setLocalSelected([])
      updateSetting([])
    } else if (selectedCommands && selectedCommands.length > 0) {
      setLocalSelected(selectedCommands)
    }
  }

  return (
    <Card title='Auto Commands on Match Start' feature='autoCommandsOnMatchStart'>
      <div className='subtitle'>Automatically send selected commands when match data is found.</div>
      <div>
        When Dotabod detects match data, it will automatically execute the commands you select below
        to provide immediate information about the match.
      </div>
      <div className='mt-5 flex items-center space-x-2'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.autoCommandsOnMatchStart}
          checked={isEnabled}
          onChange={handleEnableToggle}
          label='Enable auto commands'
        />
      </div>

      <div className={clsx(!isEnabled && 'opacity-40', 'mt-6')}>
        <Spin spinning={loading} tip='Loading'>
          <div className='space-y-3'>
            <div className='text-sm font-medium text-gray-300'>Select commands to auto-send:</div>
            {AUTO_COMMAND_OPTIONS.map((option) => (
              <div key={option.key} className='flex items-center space-x-3'>
                <Checkbox
                  checked={localSelected.includes(option.key)}
                  onChange={(e) => handleCommandToggle(option.key, e.target.checked)}
                  disabled={!isEnabled}
                />
                <div className='flex flex-col'>
                  <span className='font-mono text-sm'>{option.command}</span>
                  <span className='text-xs text-gray-400'>{option.label}</span>
                </div>
              </div>
            ))}
          </div>
        </Spin>
      </div>
    </Card>
  )
}
