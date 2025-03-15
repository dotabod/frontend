import { Card } from '@/ui/card'
import { Settings } from '@/lib/defaultSettings'
import { TierSwitch } from '../Dashboard/Features/TierSwitch'
import { GiftIcon } from 'lucide-react'

export default function GiftAlertOverlay() {
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
          <div className='relative h-32 w-full overflow-hidden rounded-md border border-gray-700 bg-gray-900'>
            <div className='absolute left-1/2 top-4 -translate-x-1/2 transform rounded-lg border-2 border-purple-500 bg-purple-900 bg-opacity-90 p-4 shadow-lg'>
              <div className='flex items-center justify-center mb-2'>
                <GiftIcon className='h-6 w-6 mr-2 text-yellow-400' />
                <h2 className='text-white text-lg font-bold'>Gift Subscription Received!</h2>
              </div>
              <div className='text-center text-white'>
                <p className='text-sm'>
                  <span className='font-bold text-yellow-400'>Anonymous</span> gifted you
                </p>
                <p className='text-md font-bold text-green-400 my-1'>1 Month of Dotabod Pro</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
