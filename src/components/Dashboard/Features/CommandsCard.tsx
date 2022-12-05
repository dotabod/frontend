import { Card } from '@/ui/card'
import { Toggle } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { CommandDetail } from '@/pages/dashboard/commands'

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
            <h3>{command.title}</h3>
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
