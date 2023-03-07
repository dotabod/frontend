import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch } from 'antd'
import { Settings } from '@/lib/defaultSettings'
import Image from 'next/image'

export default function BetsOverlay() {
  const {
    data: showLivePolls,
    updateSetting: updateLivePoll,
    loading: l2,
  } = useUpdateSetting(Settings.livePolls)

  return (
    <Card>
      <div className="title">
        <h3>Twitch predictions</h3>
      </div>
      <div className="subtitle">Let your chatters bet on your matches.</div>
      <div>
        Chatters can use their native Twitch channel points to bet on whether
        you win or lose a match.
      </div>
      <div className="mt-5 flex items-center space-x-2">
        <Switch
          loading={l2}
          onChange={updateLivePoll}
          checked={showLivePolls}
        />
        <span>Show live betting / polls overlay</span>
      </div>

      <Image
        src="https://i.imgur.com/Blo5rRr.png"
        alt="Live betting overlay"
        width={1070}
        height={436}
        className="scale-90 rounded shadow"
      />
    </Card>
  )
}
