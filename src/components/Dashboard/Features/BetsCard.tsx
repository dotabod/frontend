import { Card } from '@/ui/card'
import { Badge, Button, Collapse, Display, Image } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { DBSettings } from '@/lib/DBSettings'

export default function BetsCard() {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(
    DBSettings.bets
  )

  return (
    <Card>
      <Collapse
        shadow
        title="Twitch predictions"
        subtitle="Let your chatters bet on your matches."
      >
        <div>
          Chatters can use their native Twitch channel points to bet on whether
          you win or lose a match.
        </div>
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
