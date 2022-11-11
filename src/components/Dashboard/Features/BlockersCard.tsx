import { Card } from '@/ui/card'
import { Button } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { DBSettings } from '@/lib/DBSettings'

export default function PicksCard() {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(
    DBSettings.onlyBlockRanked
  )

  return (
    <Card>
      <Card.Header>
        <Card.Title>Blockers</Card.Title>
        <Card.Description>
          {isEnabled && (
            <span>
              Only ranked mode will show the minimap and hero pick blockers.
            </span>
          )}
          {!isEnabled && (
            <span>
              All game modes will show the minimap and hero pick blockers.
            </span>
          )}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div>
          <p className="text-xs italic">
            Ranked game modes do not include ranked random draft. They only
            include all pick and captain&apos;s mode
          </p>

          <p className="text-xs italic">
            Spectator mode will never show blockers.
          </p>
        </div>
      </Card.Content>
      <Card.Footer>
        {loading ? (
          <Button disabled>loading...</Button>
        ) : (
          <Button
            icon={isEnabled ? <PauseIcon /> : <PlayIcon />}
            type="secondary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => updateSetting(!isEnabled)}
          >
            {isEnabled ? 'Disable' : 'Enable'}
          </Button>
        )}
      </Card.Footer>
    </Card>
  )
}
