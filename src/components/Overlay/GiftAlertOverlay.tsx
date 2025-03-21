import { Card } from '@/ui/card'
import { Settings } from '@/lib/defaultSettings'
import { TierSwitch } from '../Dashboard/Features/TierSwitch'
import GiftSubscriptionAlert from './GiftAlert/GiftSubscriptionAlert'

export function GiftAlertOverlayForDashboard() {
  return (
    <Card title='Gift Subscription Alerts' feature='showGiftAlerts'>
      <div className='space-y-4'>
        <p className='text-sm text-gray-300'>
          Show a notification on your stream when someone gifts you a Dotabod Pro subscription.
        </p>

        <div className='space-y-2'>
          <TierSwitch settingKey={Settings.showGiftAlerts} label='Show gift alerts on stream' />
        </div>

        <div className='mt-4 rounded-md bg-gray-800 p-4'>
          <h3 className='mb-2 text-sm font-medium text-gray-300'>Preview</h3>
          <div className='relative h-32 w-full overflow-hidden rounded-md border border-gray-700 bg-gray-900 flex items-center justify-center'>
            <GiftSubscriptionAlert
              senderName='Anonymous'
              giftType='monthly'
              giftQuantity={1}
              preview={true}
              className='scale-75'
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
