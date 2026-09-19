import { InfoCircleOutlined } from '@ant-design/icons'
import { Alert } from 'antd'

import { Settings } from '@/lib/default-settings'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import { Card } from '@/ui/card'

import { TierSwitch } from './tier-switch'

const EXPLICIT_NOTE_COMMANDS = [
  { cmd: '!np', desc: 'Notable players' },
  { cmd: '!gm', desc: 'Game medals / ranks' },
  { cmd: '!avg', desc: 'Average rank' },
]

const SILENT_COMMANDS = [
  { cmd: '!smurfs', desc: 'Smurf check' },
  { cmd: '!lg', desc: 'Last game' },
  { cmd: '!geo', desc: 'Player locations' },
]

const LOOKUP_COMMANDS = [
  '!hero',
  '!items',
  '!d2pt',
  '!gpm',
  '!xpm',
  '!innate',
  '!shard',
  '!aghs',
  '!profile',
]

const ClippingCard = (): React.ReactNode => {
  const { data: isDisabled, updateSetting } = useUpdateSetting(Settings.disableAutoClipping)

  return (
    <Card title='High-MMR match detection' feature='disableAutoClipping'>
      <div className='subtitle'>
        Dotabod&apos;s only way to see who&apos;s in your match once your tracked MMR hits 8500+ or
        Immortal — Valve&apos;s live API stops sending roster data at that bracket.
      </div>

      <div className='my-4 flex items-center space-x-2'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.disableAutoClipping}
          checked={!isDisabled}
          onChange={(checked) => {
            updateSetting(!checked)
          }}
          label='High-MMR match detection'
        />
      </div>

      {isDisabled && (
        <Alert
          message='Commands Disabled'
          description={
            <div>
              <p className='mb-2'>
                With detection off, these commands lose match data for players with 8500+ MMR:
              </p>
              <ul className='ml-5 list-disc'>
                {[...EXPLICIT_NOTE_COMMANDS, ...SILENT_COMMANDS].map(({ cmd, desc }) => (
                  <li key={cmd}>
                    <code className='rounded bg-gray-800 px-1 py-0.5'>{cmd}</code> - {desc}
                  </li>
                ))}
                <li>Teammate/opponent lookups: {LOOKUP_COMMANDS.join(', ')}</li>
              </ul>
              <p className='mt-2 text-xs'>
                Games below 8500 MMR are unaffected — Valve&apos;s API already gives Dotabod full
                roster data for those.
              </p>
            </div>
          }
          type='warning'
          showIcon
          icon={<InfoCircleOutlined />}
          className='mt-4'
        />
      )}

      <div className='mt-4 rounded-md bg-gray-800 p-3'>
        <p className='text-xs text-gray-400'>
          Dotabod reads a 5-second Twitch clip of the draft or hero bar. The clip is created from
          your account and appears in your Twitch clips.
        </p>
      </div>
    </Card>
  )
}

export default ClippingCard
