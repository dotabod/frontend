import { Card } from '@/ui/card'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { DBSettings } from '@/lib/DBSettings'
import Image from 'next/image'
import TwitchChat from '@/components/TwitchChat'
import { Switch } from '@mantine/core'

export default function ChatterCard() {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(
    DBSettings.chatter
  )

  return (
    <Card>
      <div className="title">
        <h3>Chatter</h3>
        {loading && <Switch disabled size="lg" color="indigo" />}
        {!loading && (
          <Switch
            size="lg"
            onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            color="indigo"
            defaultChecked={isEnabled}
          />
        )}
      </div>
      <div className="subtitle">
        The bot can post some random messages as you play your game.
      </div>
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
    </Card>
  )
}
