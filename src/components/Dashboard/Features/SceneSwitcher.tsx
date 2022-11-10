import { Card } from '@/ui/card'
import { Button, Display, Image, Snippet } from '@geist-ui/core'
import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { useUpdateSetting } from '@/lib/useUpdateSetting'

const sceneNames = [
  '[dotabod] blocking minimap',
  '[dotabod] blocking picks',
  '[dotabod] game disconnected',
]

export default function SceneSwitcher(): JSX.Element {
  const { isEnabled, loading, updateSetting } =
    useUpdateSetting('obs-scene-switcher')

  return (
    <Card>
      <Card.Header>
        <Card.Title>Automatic Scene Switcher</Card.Title>
        <Card.Description className="space-y-2">
          Will auto switch scenes in OBS depending on game state.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <ul className="ml-4 mb-2 list-decimal space-y-2 text-sm text-gray-700">
          <li>
            Must set browser properties to{' '}
            <span className="italics">Advanced access to OBS</span>
          </li>
          <li>Must create the following scenes (case sensitive)</li>
          <ul className="ml-4 list-none space-y-2">
            {sceneNames.map((sceneName) => (
              <li key={sceneName}>
                <Snippet symbol="" text={sceneName} width="250px" />
              </li>
            ))}
          </ul>
          <li>
            The dotabod browser source must at least be present in the scenes
            labeled &quot;blocking&quot;. That&apos;s so the blocker can appear.
          </li>
        </ul>

        <Display shadow caption="Example OBS scenes and sources">
          <Image
            height="246px"
            alt="scene switcher"
            src="/images/scene-switcher.png"
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
