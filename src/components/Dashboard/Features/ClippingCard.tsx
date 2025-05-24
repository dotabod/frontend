import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { InfoCircleOutlined } from '@ant-design/icons'
import { Alert, Tag } from 'antd'
import { TierSwitch } from './TierSwitch'

/**
 * ClippingCard component controls automatic clip creation for high MMR players.
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
  const { data: isDisabled } = useUpdateSetting(Settings.disableAutoClipping)

  return (
    <Card title='Automatic Clipping' feature='disableAutoClipping'>
      <div className='subtitle'>
        Control automatic clip creation for high MMR players (8500+ or Immortal rank).
      </div>

      <div className='mb-4'>
        <p className='text-sm text-gray-300 mb-4'>
          When enabled, Dotabod automatically creates clips during strategy time to capture player
          ranks and heroes for the <code className='bg-gray-800 px-1 py-0.5 rounded'>!np</code> and{' '}
          <code className='bg-gray-800 px-1 py-0.5 rounded'>!gm</code> commands. This is required
          for players with 8500+ MMR due to Valve API restrictions.
        </p>
      </div>

      <div className='flex items-center space-x-2 mb-4'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.disableAutoClipping}
          label='Disable automatic clipping'
        />
        <Tag color={isDisabled ? 'red' : 'green'}>
          {isDisabled ? 'Clipping Disabled' : 'Clipping Enabled'}
        </Tag>
      </div>

      {isDisabled && (
        <Alert
          message='Commands Disabled'
          description={
            <div>
              <p className='mb-2'>
                With automatic clipping disabled, the following commands will not work for players
                with 8500+ MMR:
              </p>
              <ul className='list-disc ml-5'>
                <li>
                  <code className='bg-gray-800 px-1 py-0.5 rounded'>!np</code> - Notable players
                  (list of player names)
                </li>
                <li>
                  <code className='bg-gray-800 px-1 py-0.5 rounded'>!gm</code> - Game medals (list
                  of player ranks)
                </li>
              </ul>
              <p className='mt-2 text-xs'>
                These commands will still work for players below 8500 MMR who don't require
                clipping.
              </p>
            </div>
          }
          type='warning'
          showIcon
          icon={<InfoCircleOutlined />}
          className='mt-4'
        />
      )}

      <div className='mt-4 p-3 bg-gray-800 rounded-md'>
        <p className='text-xs text-gray-400'>
          <strong>How it works:</strong> Dotabod creates a 5-second clip 50 seconds after strategy
          time begins, then uses vision AI to extract player information. The clip is created from
          your account and will show up in your clips on Twitch.
        </p>
      </div>
    </Card>
  )
}
