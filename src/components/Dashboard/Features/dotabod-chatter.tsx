import { Tooltip } from 'antd'

import { Settings } from '@/lib/default-settings'
import { Card } from '@/ui/card'

import { TierSwitch } from './tier-switch'

const DotabodChatter = () => (
  <Card>
    <div className='title'>
      <h3>Dotabod</h3>
    </div>

    <div className='mt-5 flex items-center space-x-2'>
      <TierSwitch settingKey={Settings.tellChatBets} label='Announce prediction changes in chat' />
    </div>
    <div className='mt-5 flex items-center space-x-2'>
      <Tooltip
        placement='bottom'
        title='After a match or a manual MMR update'
        className='flex items-center space-x-2'
      >
        <TierSwitch settingKey={Settings.tellChatNewMMR} label='Announce MMR changes in chat' />
      </Tooltip>
    </div>
  </Card>
)

export default DotabodChatter
