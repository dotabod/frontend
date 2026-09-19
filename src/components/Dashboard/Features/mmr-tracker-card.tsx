import { Tag, Tooltip } from 'antd'
import { clsx } from 'clsx'

import { Settings } from '@/lib/default-settings'
import { Card } from '@/ui/card'

import MmrForm from './mmr-form'
import { TierSwitch } from './tier-switch'

const MmrTrackerCard = () => (
  <Card title='MMR tracker'>
    <div className='subtitle'>
      <p>Give or take 20/25 MMR after every ranked match.</p>
    </div>

    <MmrForm />

    <div className={clsx('py-4 transition-all')}>
      <div className='flex flex-col items-start space-y-2 md:space-y-3'>
        <TierSwitch settingKey={Settings['mmr-tracker']} label='Update MMR after every match' />

        <Tooltip
          placement='bottom'
          title='Enable this to award 20 MMR instead of 30 for all matches. Disable to use 25 MMR again.'
        >
          <div className={clsx('mt-5 w-fit transition-all')}>
            <TierSwitch settingKey={Settings.onlyParty} label='Party queue only' />
          </div>
        </Tooltip>
      </div>
    </div>
    <p className='text-xs'>
      Dota no longer reports exact MMR changes. Update it here or use <Tag>!setmmr</Tag>; approved
      managers can use the command too.
    </p>
  </Card>
)

export default MmrTrackerCard
