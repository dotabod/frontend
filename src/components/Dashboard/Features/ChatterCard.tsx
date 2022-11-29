import { Card } from '@/ui/card'
import { Button } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { DBSettings } from '@/lib/DBSettings'
import Image from 'next/image'
import TwitchChat from '@/components/TwitchChat'

export default function ChatterCard() {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(
    DBSettings.chatter
  )

  return (
    <Card>
      <Card.Header>
        <Card.Title>Chatter</Card.Title>
        <Card.Description>
          The bot can post some random messages as you play your game.
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-2">
        <TwitchChat
          responses={[
            <>
              <Image
                width={22}
                height={22}
                alt="pausechamp"
                className="mr-1 inline align-middle"
                src="/images/pauseChamp.webp"
              />
              <span>Who paused the game?</span>
            </>,
            <>
              <Image
                width={22}
                height={22}
                alt="pausechamp"
                className="mr-1 inline align-middle"
                src="/images/massivePIDAS.webp"
              />
              <span>Use your midas</span>
            </>,
            <>
              <span>🚬💣 Clockwerk is smoked!</span>
            </>,
          ]}
        />
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
