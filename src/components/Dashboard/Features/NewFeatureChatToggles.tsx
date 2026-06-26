import Link from 'next/link'
import type { ReactNode } from 'react'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { TierSwitch } from './TierSwitch'

// New-feature chat toggles (cosmetic-set announcements, team smoke alerts). They follow the
// autoOptInNewFeatures master until the streamer makes an explicit choice — the same rule as
// the What's New card (see entryToggleChecked), so a plain TierSwitch would mis-render the
// tri-state `null` default as "off". This gives the toggles a permanent home on the Chat
// features page; they previously lived ONLY in What's New, where streamers couldn't find them.
function MasterFollowingToggle({
  settingKey,
  label,
  description,
}: {
  settingKey: typeof Settings.cosmeticsAnnounce | typeof Settings.smokeActivated
  label: string
  description: ReactNode
}) {
  const { data: master } = useUpdateSetting<boolean>(Settings.autoOptInNewFeatures)
  const { data: value, updateSetting } = useUpdateSetting<boolean | null>(settingKey)

  return (
    <div className='space-y-1'>
      <TierSwitch
        settingKey={settingKey}
        checked={value ?? master}
        onChange={(checked) => updateSetting(checked)}
        label={label}
      />
      <p className='ml-12 text-sm text-gray-400'>{description}</p>
    </div>
  )
}

export default function NewFeatureChatToggles() {
  return (
    <Card title='New chat features'>
      <div className='ml-4 flex flex-col space-y-4'>
        <MasterFollowingToggle
          settingKey={Settings.cosmeticsAnnounce}
          label='Cosmetic set announcements'
          description={
            <>
              When you pick a hero, Dotabod posts your equipped cosmetic set in chat with a link to
              your collection. This is separate from the{' '}
              <Link href='/dashboard/commands' className='text-purple-400 hover:text-purple-300'>
                <code>!set</code> command
              </Link>
              , which only replies on demand.
            </>
          }
        />
        <MasterFollowingToggle
          settingKey={Settings.smokeActivated}
          label='Team smoke alerts'
          description='When your team pops Smoke of Deceit without you, Dotabod ribs you in chat a few seconds later for getting left behind. Separate from the Smoke alert (when your own hero is smoked) in the chatter list below.'
        />
      </div>
    </Card>
  )
}
