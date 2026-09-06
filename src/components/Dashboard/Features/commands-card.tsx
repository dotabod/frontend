import { Collapse, Tag } from 'antd'

import type CommandDetail from '@/components/Dashboard/command-detail'
import { useFeatureAccess } from '@/hooks/use-subscription'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'

import { TierSwitch } from './tier-switch'

export default function CommandsCard({
  id,
  command,
  readonly,
  publicIsEnabled,
  isOpen,
  onClose,
}: {
  readonly?: boolean
  id: string
  command: (typeof CommandDetail)[keyof typeof CommandDetail]
  publicIsEnabled?: boolean
  publicLoading?: boolean
  isOpen?: boolean
  onClose?: () => void
}): React.ReactNode {
  const { data: isEnabled, updateSetting } = useUpdateSetting(command.key)
  const { hasAccess } = useFeatureAccess(command.key)

  return (
    <Collapse
      bordered={false}
      className='bg-transparent'
      activeKey={isOpen ? [id] : undefined}
      onChange={(keys) => {
        if (isOpen && !keys.includes(id)) {
          onClose?.()
        }
      }}
    >
      <Collapse.Panel
        className={`rounded-lg! border border-transparent bg-gray-900 p-5 text-sm text-gray-300 shadow-lg transition-all hover:border hover:border-gray-600 hover:shadow-xs hover:shadow-gray-500${
          readonly && (publicIsEnabled === undefined ? !isEnabled : !publicIsEnabled)
            ? ' opacity-50'
            : ''
        }`}
        style={{ padding: 0 }}
        header={
          <div className='flex items-center justify-between gap-3'>
            <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
              <span>{command.title}</span>
              <div>
                {command.allowed === 'mods' && (
                  <div className='flex flex-wrap gap-2'>
                    <Tag color='green'>Mods</Tag>
                    <Tag color='red'>Streamer</Tag>
                  </div>
                )}
                {command.allowed === 'all' && <Tag>All</Tag>}
              </div>
            </div>
            {command.key &&
              (readonly ? (
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
                    (publicIsEnabled === undefined ? isEnabled : publicIsEnabled)
                      ? 'bg-green-950 text-green-400 ring-1 ring-green-800'
                      : 'bg-gray-800 text-gray-600'
                  }`}
                >
                  {(publicIsEnabled === undefined ? isEnabled : publicIsEnabled)
                    ? 'Enabled'
                    : 'Disabled'}
                </span>
              ) : (
                <TierSwitch
                  settingKey={command.key}
                  disabled={!hasAccess}
                  checked={publicIsEnabled === undefined ? isEnabled : publicIsEnabled}
                  onChange={hasAccess ? updateSetting : undefined}
                />
              ))}
          </div>
        }
        key={id}
      >
        <div className='subtitle'>{command.description}</div>
        {command.response && <command.response dark />}
        {command.cmd && (
          <div className='py-1'>
            <p className='ml-1'>Command</p>
            <div className='flex flex-wrap'>
              <div className='mr-2 mb-2'>
                <Tag>{command.cmd}</Tag>
              </div>
            </div>
          </div>
        )}
        {command.alias?.length ? (
          <div className='py-1'>
            <p className='ml-1'>Alias</p>
            <div className='flex flex-wrap'>
              {command.alias.map((alias) => (
                <div key={alias} className='mr-2 mb-2'>
                  <Tag>!{alias}</Tag>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Collapse.Panel>
    </Collapse>
  )
}
