import { Card } from '@/ui/card'
import { Button, Display, Image, Input } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { ArrowPathIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { DBSettings } from '@/lib/DBSettings'
import { useUpdateUser } from '@/lib/useUpdateUser'

export default function MmrTrackerCard() {
  const {
    isEnabled,
    loading: l0,
    updateSetting,
  } = useUpdateSetting(DBSettings.mmrTracker)
  const { user, updateMmr, loading: l1 } = useUpdateUser()
  const loading = l0 || l1

  return (
    <Card>
      <Card.Header>
        <Card.Title>MMR Tracker</Card.Title>
        <Card.Description>Show your MMR on the screen</Card.Description>
      </Card.Header>
      <Card.Content>
        <label htmlFor="mmr" className="block text-sm">
          Current MMR
        </label>
        <div className="flex space-x-4">
          <Input
            placeholder="Enter MMR"
            name="mmr"
            initialValue={user.mmr}
            disabled={!isEnabled}
            onChange={(e) => {
              updateMmr(e.target.value)
            }}
          />
          <Button
            icon={<ArrowPathIcon />}
            type="secondary"
            scale={0.7}
            disabled={!isEnabled}
          >
            Sync
          </Button>
        </div>
        <Display shadow caption="Show your MMR on the screen">
          <Image
            alt="mmr tracker"
            height="200px"
            src="/images/mmr-tracker.png"
            style={{
              backgroundImage:
                "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUAQMAAAC3R49OAAAABlBMVEX////09PQtDxrOAAAAE0lEQVQI12P4f4CBKMxg/4EYDAAFkR1NiYvv7QAAAABJRU5ErkJggg==')",
            }}
          />
        </Display>
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
