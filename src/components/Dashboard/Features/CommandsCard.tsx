import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import CommandDetail from '@/components/Dashboard/CommandDetail'
import { Tag, Switch, Collapse } from 'antd'

export default function CommandsCard({
  id,
  command,
}: {
  id: string
  command: typeof CommandDetail.commandAPM
}): JSX.Element {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(command.key)

  return (
    <Collapse>
      <Collapse.Panel
        header={
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <span>{command.title}</span>
              <div>
                {command.allowed === 'mods' && (
                  <>
                    <Tag color="green">Mods</Tag>
                    <Tag color="red">Streamer</Tag>
                  </>
                )}
                {command.allowed === 'all' && <Tag>All</Tag>}
              </div>
            </div>
            {loading && command.key && <Switch disabled className="flex" />}
            {!loading && command.key && (
              <Switch
                defaultChecked={isEnabled}
                onChange={updateSetting}
                onClick={(v, e) => {
                  e.stopPropagation()
                }}
              />
            )}
          </div>
        }
        key={id}
      >
        <div className="subtitle">{command.description}</div>
        {command.response && <command.response dark />}
        <div className="py-1">
          <p className="ml-1">Command</p>
          <div className="flex flex-wrap">
            <div className="mr-2 mb-2">
              <Tag>{command.cmd}</Tag>
            </div>
          </div>
        </div>
        {command.alias && command.alias.length ? (
          <div className="py-1">
            <p className="ml-1">Alias</p>
            <div className="flex flex-wrap">
              {command.alias.map((alias) => (
                <div key={`${alias}`} className="mr-2 mb-2">
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
