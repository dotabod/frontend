import { Card } from '@/ui/card'
import { Button, Checkbox, Display, Image } from '@geist-ui/core'
import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { useUpdateSetting } from '@/lib/useUpdateSetting'

export default function MinimapCard(): JSX.Element {
  const { isEnabled, loading, updateSetting } =
    useUpdateSetting('minimap-blocker')

  const handler = (value) => {
    console.log(value)
  }
  return (
    <Card>
      <Card.Header>
        <Card.Title>Minimap</Card.Title>
        <Card.Description>
          Block your minimap to deter people from destroying your wards or
          observing teammate positions. This overlay will make it confusing to
          see where the true wards are.
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col items-center">
        <div>
          <Display
            shadow
            caption="Minimap blocker that auto places itself over your minimap"
          >
            <Image
              alt="minimap blocker"
              height="244px"
              src="/images/731-Complex-Large-AntiStreamSnipeMap.png"
              style={{
                backgroundImage:
                  "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUAQMAAAC3R49OAAAABlBMVEX////09PQtDxrOAAAAE0lEQVQI12P4f4CBKMxg/4EYDAAFkR1NiYvv7QAAAABJRU5ErkJggg==')",
              }}
            />
          </Display>
        </div>
      </Card.Content>
      <Card.Footer className="flex items-center space-x-4">
        {loading ? (
          <Button disabled>loading...</Button>
        ) : (
          <Button
            icon={isEnabled ? <PauseIcon /> : <PlayIcon />}
            type="secondary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              updateSetting(!isEnabled)
            }}
          >
            {isEnabled ? 'Disable' : 'Enable'}
          </Button>
        )}
        <div className="flex flex-col items-start space-y-2 md:space-y-1">
          <Checkbox disabled={!isEnabled} value="complex" checked={false}>
            Use simple minimap background
          </Checkbox>
          <Checkbox disabled={!isEnabled} value="extra-large" checked={false}>
            Use extra large minimap
          </Checkbox>
        </div>
      </Card.Footer>
    </Card>
  )
}
