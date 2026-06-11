import Link from 'next/link'
import { Settings } from '@/lib/defaultSettings'
import { Card } from '@/ui/card'
import { TierSwitch } from './TierSwitch'

// Account-wide control for how new dotabod features (across chat, overlays, betting, etc.)
// roll out — deliberately NOT a feature-specific toggle. The master sets the default for
// features a streamer hasn't touched; each feature's own toggle lives on the What's New page.
export default function NewFeaturesCard() {
  return (
    <Card title='New features'>
      <div className='mb-4'>
        Dotabod ships new features across chat, overlays, and more over time. Leave this on to get
        them automatically as they launch, or turn it off to opt in to each one yourself.
      </div>
      <div className='ml-1 flex flex-col space-y-3'>
        <TierSwitch
          settingKey={Settings.autoOptInNewFeatures}
          label='Automatically enable new features as they launch'
        />
        <Link
          href='/dashboard/whats-new'
          className='text-sm font-medium text-purple-400 hover:text-purple-300'
        >
          See what&apos;s new
        </Link>
      </div>
    </Card>
  )
}
