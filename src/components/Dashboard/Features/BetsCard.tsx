import { Card } from '@/ui/card'
import { Badge, Button, Display, Image } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { DBSettings } from '@/lib/DBSettings'

export default function BetsCard() {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(
    DBSettings.bets
  )

  return (
    <Card>
      <Card.Header>
        <Card.Title>Twitch Predictions</Card.Title>
        <Card.Description>
          Let your chatters bet with their native Twitch channel points whether
          you win or lose the game. After the match ends, the bets will close
          and points go to the winners!
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Display
          shadow
          caption={
            <div className="space-x-1 text-sm text-gray-500">
              <p className="inline">
                Customize the prediction title and answers.
              </p>
              <Badge scale={0.5} type="secondary" className="inline opacity-60">
                coming soon
              </Badge>
            </div>
          }
        >
          <Image
            alt="picks blocker"
            height="200px"
            src="/images/bets.png"
            className="bg-gray-500"
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
