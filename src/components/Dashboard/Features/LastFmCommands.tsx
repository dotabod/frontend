import { Settings } from '@/lib/defaultSettings'
import { Typography, Space } from 'antd'
import { TierSwitch } from './TierSwitch'
import { Card } from '@/ui/Card'

const { Text, Paragraph } = Typography

export default function LastFmCommands() {
  return (
    <Card title='Last.fm Commands'>
      <Paragraph type='secondary' className='mb-4'>
        Enable chat commands for your Last.fm integration
      </Paragraph>
      <div className='space-y-2'>
        <div className='mt-4 flex flex-col space-y-2'>
          <Space align='center'>
            <TierSwitch settingKey={Settings.commandLastFm} label='!song, !np, !music' />
            <Text type='secondary' className='text-xs'>
              Show what music you are listening to on Last.fm
            </Text>
          </Space>
        </div>
        <div className='mt-2'>
          <Paragraph type='secondary' className='text-sm'>
            To enable these commands, you must also configure your Last.fm username in the Overlay
            section.
          </Paragraph>
        </div>
      </div>
    </Card>
  )
}
