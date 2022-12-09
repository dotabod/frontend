import { Card } from '@/ui/card'
import { Badge, Display } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { DBSettings } from '@/lib/DBSettings'
import Image from 'next/image'
import { Switch } from '@mantine/core'

export default function BetsCard() {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(
    DBSettings.bets
  )

  return (
    <Card>
      <div className="title">
        <h3>Twitch predictions</h3>
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
      <div className="subtitle">Let your chatters bet on your matches.</div>
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
          alt="bets image"
          width={400}
          height={640}
          src="/images/bets.png"
          className="bg-gray-500"
        />
      </Display>
    </Card>
  )
}
