import { Card } from '@/ui/card'
import { Button, Display, Image, Input, Loading } from '@geist-ui/core'
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
        <Card.Description>
          Automatically goes up or down after every match. !mmr` will work to
          show mmr to your chatters! If it ever gets out of sync, you can update
          it here.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <label htmlFor="mmr" className="block text-sm">
          Current MMR
        </label>
        <div className="flex space-x-4">
          {loading && (
            <div className="w-52 rounded-md border border-gray-200 pt-2">
              <Loading className="left-0" />
            </div>
          )}
          {!loading && (
            <Input
              placeholder="Enter MMR"
              name="mmr"
              style={{ width: 208 }}
              htmlType="number"
              min={0}
              max={30000}
              initialValue={user.mmr}
              disabled={!isEnabled}
              onChange={(e) => {
                updateMmr(e.target.value)
              }}
            />
          )}
        </div>
        <Display
          shadow
          caption="Correct badge and MMR shown next to shop button"
        >
          <Image
            alt="mmr tracker"
            height="200px"
            src="/images/mmr-tracker.png"
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
