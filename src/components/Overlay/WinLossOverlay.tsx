import clsx from 'clsx'
import { Settings } from '@/lib/defaultSettings'
import { Card } from '@/ui/card'
import { TierSwitch } from '../Dashboard/Features/TierSwitch'
import WinLossCard from './wl/WinLossCard'

export default function WinLossOverlay() {
  return (
    <Card title='Win/loss'>
      <div className='subtitle'>
        Show your win/loss ratio on your overlay, in the bottom right corner. Turning this off will
        also disable the !wl command.
      </div>

      <div className={clsx('py-4 transition-all')}>
        <div className='flex flex-col items-start space-y-2 md:space-y-3'>
          <div className='flex items-center space-x-2'>
            <TierSwitch settingKey={Settings.commandWL} label='Show win/loss' />
          </div>
        </div>
      </div>

      <div className='my-6 flex justify-center space-x-4'>
        <WinLossCard wl={[{ win: 10, lose: 5, type: '10-5' }]} />
      </div>
    </Card>
  )
}
