import { Tag, Tooltip } from 'antd'
import clsx from 'clsx'
import { Settings } from '@/lib/defaultSettings'
import { Card } from '@/ui/card'
import MmrForm from './MmrForm'
import { TierSwitch } from './TierSwitch'

export default function MmrTrackerCard() {
  return (
    <Card title='MMR tracker'>
      <div className='subtitle'>
        <p>Give or take 20/25 MMR after every ranked match.</p>
      </div>
      <div>A list of accounts will show below as you play on them.</div>

      <MmrForm />

      <div className={clsx('py-4 transition-all')}>
        <div className='flex flex-col items-start space-y-2 md:space-y-3'>
          <TierSwitch settingKey={Settings['mmr-tracker']} label='Update mmr with every match' />

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
        Note: Since the 7.33 patch released on {new Date('2023-04-20').toLocaleDateString()},
        Dotabod can no longer accurately estimate the MMR from each game. You can either use !setmmr
        or update it here after a game or after your stream. You can also have your mods do it for
        you via <Tag>!setmmr</Tag>
      </p>
    </Card>
  )
}
