import { InfoCircleOutlined } from '@ant-design/icons'
import { Alert, Tag } from 'antd'

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

/**
 * ClippingCard component controls the vision fallback that gives Dotabod match
 * rosters once Valve's live API stops returning them (8500+ MMR / Immortal).
 *
 * Backend Integration:
 * The backend should check the `disableAutoClipping` setting from the user's settings
 * in addition to the existing is8500Plus check:
 *
 * ```typescript
 * // Check if user has disabled clipping in their settings
 * const clippingDisabled = dotaClient.client.settings?.disableAutoClipping || false;
 *
 * // Only create a clip if the user is >= 8500 MMR AND has not disabled clipping
 * if (!is8500Plus(dotaClient.client) || clippingDisabled) {
 *   return
 * }
 * ```
 */
export default function ClippingCard(): React.ReactNode {
  const { data: isDisabled, updateSetting } = useUpdateSetting(Settings.disableAutoClipping)

  return (
    <Card title='High-MMR Match Detection' feature='disableAutoClipping'>
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
        <Tag color={isDisabled ? 'red' : 'green'}>
          {isDisabled ? 'Detection Off' : 'Detection Active'}
        </Tag>
      </div>

      <div className='mb-4'>
        <p className='mb-2 text-sm font-medium text-gray-300'>Powers these commands:</p>
        <div className='space-y-3'>
          <div>
            <p className='mb-1 text-xs text-gray-400'>
              Shows a &quot;no data&quot; message when off:
            </p>
            <div className='flex flex-wrap gap-2'>
              {EXPLICIT_NOTE_COMMANDS.map(({ cmd, desc }) => (
                <span key={cmd} className='rounded bg-gray-800 px-2 py-0.5 text-xs'>
                  <code>{cmd}</code> <span className='text-gray-400'>· {desc}</span>
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className='mb-1 text-xs text-gray-400'>Roster silently comes back empty:</p>
            <div className='flex flex-wrap gap-2'>
              {SILENT_COMMANDS.map(({ cmd, desc }) => (
                <span key={cmd} className='rounded bg-gray-800 px-2 py-0.5 text-xs'>
                  <code>{cmd}</code> <span className='text-gray-400'>· {desc}</span>
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className='mb-1 text-xs text-gray-400'>
              Only when asked about a teammate or opponent (asking about yourself always works):
            </p>
            <div className='flex flex-wrap gap-2'>
              {LOOKUP_COMMANDS.map((cmd) => (
                <code key={cmd} className='rounded bg-gray-800 px-2 py-0.5 text-xs'>
                  {cmd}
                </code>
              ))}
            </div>
          </div>
        </div>
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
          <strong>How it works:</strong> since Valve won&apos;t hand over the data directly, Dotabod
          grabs a 5-second Twitch clip of the draft/hero bar and reads it with vision AI. The clip
          is created from your account and will show up in your Twitch clips as a side effect.
        </p>
      </div>
    </Card>
  )
}
