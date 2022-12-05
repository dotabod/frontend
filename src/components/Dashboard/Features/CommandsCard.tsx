import { Card } from '@/ui/card'
import { Badge, Toggle } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { CommandDetail } from '@/pages/dashboard/commands'

const all = ['Moderators', 'Broadcaster', 'Everyone']

export default function CommandsCard({
  command,
}: {
  command: typeof CommandDetail.commandAPM
}): JSX.Element {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(command.key)

  return (
    <Card className="p-5">
      <div className="flex justify-between">
        <div>
          <div className="title">
            <h3>
              {command.title}{' '}
              <div className="ml-4 inline space-x-2">
                {' '}
                {command.allowed === 'mods' && (
                  <>
                    <Badge type="success" className="!bg-green-800" scale={0.5}>
                      Moderator
                    </Badge>
                    <Badge type="success" className="!bg-red-800" scale={0.5}>
                      Broadcaster
                    </Badge>
                  </>
                )}
                {command.allowed === 'all' && (
                  <>
                    <Badge type="default" scale={0.5}>
                      Everyone
                    </Badge>
                  </>
                )}
              </div>
            </h3>
            <div className="subtitle">{command.description}</div>
          </div>
          {command.response && <command.response dark />}
        </div>

        {command.key && (
          <Toggle
            scale={3}
            initialChecked={isEnabled}
            onChange={(e) => updateSetting(!!e?.target?.checked)}
          >
            !mmr
          </Toggle>
        )}
      </div>
    </Card>
  )
}
