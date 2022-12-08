import { Card } from '@/ui/card'
import { Button, Collapse } from '@geist-ui/core'
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
      <Collapse
        shadow
        title="Chatter"
        subtitle="The bot can post some random messages as you play your game."
      >
        <TwitchChat
          dark
          responses={[
            <>
              <Image
                width={22}
                height={22}
                alt="pauseChamp"
                className="mr-1 inline align-middle"
                src="/images/pauseChamp.webp"
              />
              <span>Who paused the game?</span>
            </>,
            <>
              <Image
                width={22}
                height={22}
                alt="massivePIDAS"
                className="mr-1 inline align-middle"
                src="/images/massivePIDAS.webp"
              />
              <span>Use your midas</span>
            </>,
            <>
              <Image
                width={22}
                height={22}
                alt="Shush"
                className="mr-1 inline align-middle"
                src="/images/Shush.png"
              />
              <span>Clockwerk is smoked!</span>
            </>,
          ]}
        />
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
