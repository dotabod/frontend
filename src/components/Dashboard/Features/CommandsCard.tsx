import { Card } from '@/ui/card'
import { Badge } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { CommandDetail } from '@/pages/dashboard/commands'
import { Switch } from '@mantine/core'

const all = ['Moderators', 'Broadcaster', 'Everyone']

export default function CommandsCard({
  command,
}: {
  command: typeof CommandDetail.commandAPM
}): JSX.Element {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(command.key)

  return (
    <Card>
      <div className="title">
        <div className="flex justify-between">
          <div className="flex space-x-2">
            <h3>{command.title}</h3>
            <div className="space-x-2">
              {command.allowed === 'mods' && (
                <>
                  <Badge type="success" className="!bg-green-800" scale={0.5}>
                    Mods
                  </Badge>
                  <Badge type="success" className="!bg-red-800" scale={0.5}>
                    Streamer
                  </Badge>
                </>
              )}
              {command.allowed === 'all' && (
                <>
                  <Badge type="default" scale={0.5}>
                    All
                  </Badge>
                </>
              )}
            </div>
          </div>
          {command.key && (
            <Switch
              className="flex"
              color="indigo"
              checked={isEnabled}
              onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            >
              !mmr
            </Switch>
          )}
        </div>
        <div className="subtitle">{command.description}</div>
      </div>
      {command.response && <command.response dark />}
    </Card>
  )
}
