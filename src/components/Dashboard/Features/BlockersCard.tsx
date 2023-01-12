import { Card } from '@/ui/card'
import { Button, Collapse } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { Settings } from '@/lib/defaultSettings'

export default function PicksCard() {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings['only-block-ranked'])

  return (
    <Card>
      <Collapse
        shadow
        title="Blockers"
        subtitle={
          <>
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
          </>
        }
      >
        <div>
          <p className="text-xs italic">
            Ranked game modes do not include ranked random draft. They only
            include all pick and captain&apos;s mode
          </p>

          <p className="text-xs italic">
            Spectator mode will never show blockers.
          </p>
        </div>
        <Card.Footer>
          {loading ? (
            <Button disabled>loading...</Button>
          ) : (
            <Button
              icon={isEnabled ? <PauseIcon /> : <PlayIcon />}
              type="success"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => updateSetting(!isEnabled)}
            >
              {isEnabled ? 'Disable' : 'Enable'}
            </Button>
          )}
        </Card.Footer>
      </Collapse>
    </Card>
  )
}
