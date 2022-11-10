import { Card } from '@/ui/card'
import { Button, Display, Image } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { DBSettings } from '@/lib/DBSettings'

export default function PicksCard() {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(
    DBSettings.pblock
  )

  return (
    <Card>
      <Card.Header>
        <Card.Title>Picks</Card.Title>
        <Card.Description>
          Block your picks to deter people from banning your heros or countering
          your picks. Radiant blocker shown below as an example. The bot will
          pick the right overlay depending on which team you end up on.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Display
          shadow
          caption="Picks blocker that auto places itself over your pick screen"
        >
          <Image
            alt="picks blocker"
            height="400px"
            src="/images/block-radiant-picks.png"
            className="bg-gray-500"
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
