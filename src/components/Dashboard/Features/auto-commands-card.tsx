import { Alert, Checkbox, Collapse, Spin, Tag } from 'antd'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

import CommandDetail from '@/components/Dashboard/command-detail'
import { Settings } from '@/lib/default-settings'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import { Card } from '@/ui/card'

import { TierSwitch } from './tier-switch'

const AUTO_COMMAND_KEYS = [
  'commandNP',
  'commandSmurfs',
  'commandGM',
  'commandLG',
  'commandAvg',
] as const

export const AutoCommandsCard = () => {
  const {
    data: selectedCommands,
    loading,
    isSaving,
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

  const rowsDisabled = !isEnabled || isSaving

  return (
    <Card title='Auto Commands on Match Start' feature='autoCommandsOnMatchStart'>
      <div className='subtitle'>
        Automatically sends the commands you select below as soon as your match actually begins.
      </div>
      <div>
        Once your hero loads into the match, right after picks lock in, Dotabod sends each selected
        command to chat for you, no need to type them yourself.
      </div>

      <div className='mt-5 flex items-center space-x-2'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.autoCommandsOnMatchStart}
          checked={isEnabled}
          onChange={handleEnableToggle}
          disabled={isSaving}
          label='Enable auto commands'
        />
        <Tag color={isEnabled ? 'green' : 'default'}>{isEnabled ? 'Enabled' : 'Disabled'}</Tag>
      </div>

      {isEnabled && localSelected.length === 0 && (
        <Alert
          className='mt-4'
          type='info'
          showIcon
          message='Nothing selected yet. Check at least one command below to activate auto commands.'
        />
      )}

      <div className={clsx(!isEnabled && 'opacity-40', 'mt-6')}>
        <Spin spinning={loading} tip='Loading'>
          <div className='mb-3 text-sm font-medium text-gray-300'>
            Select commands to auto-send:
          </div>
          <Collapse bordered={false} className='bg-transparent'>
            {AUTO_COMMAND_KEYS.map((key) => {
              const command = CommandDetail[key]
              const checked = localSelected.includes(key)
              return (
                <Collapse.Panel
                  key={key}
                  className='mb-2 rounded-md! border border-gray-700 bg-gray-800/60'
                  collapsible={rowsDisabled ? 'disabled' : undefined}
                  header={
                    <div className='flex items-center space-x-3'>
                      <Checkbox
                        checked={checked}
                        disabled={rowsDisabled}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                        onChange={(e) => {
                          handleCommandToggle(key, e.target.checked)
                        }}
                      />
                      <div className='flex flex-col'>
                        <span className='font-mono text-sm'>{command.cmd}</span>
                        <span className='text-xs text-gray-400'>{command.title}</span>
                      </div>
                    </div>
                  }
                >
                  <div className='mb-2 text-sm text-gray-300'>{command.description}</div>
                  {command.response && <command.response />}
                </Collapse.Panel>
              )
            })}
          </Collapse>
        </Spin>
      </div>

      <div className='mt-4 rounded-md bg-gray-800 p-3'>
        <p className='text-xs text-gray-400'>
          <strong>How it works:</strong> Dotabod detects your match has started once your hero has
          loaded in with starting items, a few seconds after picks lock in. It then sends each
          selected command to chat exactly as if typed manually, with a short pause between each to
          avoid Twitch rate limits. This runs once per match.
        </p>
      </div>
    </Card>
  )
}
