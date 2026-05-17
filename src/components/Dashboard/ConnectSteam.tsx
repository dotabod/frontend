import { CheckCircleFilled } from '@ant-design/icons'
import { Alert, Button, Collapse, Tag } from 'antd'
import Link from 'next/link'
import { useState } from 'react'
import { useSteamLinkedAccount } from '@/lib/hooks/useSteamLinkedAccount'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'

type Props = {
  isLive: boolean
}

const ConnectSteam = ({ isLive }: Props) => {
  const track = useTrack()
  const [hasLaunchedDota, setHasLaunchedDota] = useState(false)

  const { data, error, isLoading, mutate } = useSteamLinkedAccount()

  const linked = Boolean(data?.linked)
  const accountName = data?.primaryAccount?.profileData?.name
  // Only surface the error after the first load attempt has completed, so a transient
  // first-paint blip doesn't show an alarming banner to a user whose page is fine.
  const showFetchError = Boolean(error) && !isLoading && !data

  const launchDota = () => {
    track('setup/launch_dota2_clicked')
    setHasLaunchedDota(true)
    window.location.href = 'steam://run/570'
    setTimeout(() => {
      if (!document.hidden) {
        window.open('https://store.steampowered.com/app/570/Dota_2/', '_blank')
      }
    }, 500)
  }

  return (
    <Card>
      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-1'>Connect your Steam account</h2>
        <p className='text-gray-400'>
          Play any match or demo a hero while your stream is live. Your Steam account links
          automatically the first time, once only.
        </p>
      </div>

      <StatusPanel isLive={isLive} linked={linked} accountName={accountName} />

      {showFetchError && (
        <Alert
          className='mt-4'
          type='warning'
          showIcon
          message="We couldn't check your Steam connection status."
          description={
            <span>
              The page will keep retrying in the background. If this sticks,{' '}
              <button
                type='button'
                onClick={() => mutate()}
                className='underline bg-transparent border-0 p-0 cursor-pointer text-inherit'
              >
                try again
              </button>{' '}
              or{' '}
              <Link href='/dashboard/help' className='underline'>
                let us know
              </Link>
              .
            </span>
          }
        />
      )}

      {!linked && (
        <div className='mt-6'>
          <Button type='primary' size='large' block onClick={launchDota}>
            Launch Dota 2
          </Button>
          {hasLaunchedDota && (
            <p className='text-xs text-gray-400 mt-2 text-center'>
              Once you&apos;re in a match (or demo), this page will update on its own.
            </p>
          )}
        </div>
      )}

      {linked && (
        <div className='mt-6'>
          <Link href='/dashboard/features'>
            <Button type='primary' size='large' block>
              View Dotabod features
            </Button>
          </Link>
        </div>
      )}

      <div className='mt-8'>
        <Collapse
          ghost
          onChange={() => track('setup/collapse_test_dotabod')}
          items={[
            {
              key: 'help',
              label: linked
                ? 'Something off with your Steam account?'
                : 'Account not appearing after playing?',
              children: <TroubleshootingContent isLive={isLive} />,
            },
          ]}
        />
      </div>
    </Card>
  )
}

const StatusPanel = ({
  isLive,
  linked,
  accountName,
}: {
  isLive: boolean
  linked: boolean
  accountName?: string
}) => {
  let steamHint: string | undefined
  if (linked) {
    steamHint = 'Your MMR and recent matches will start appearing on stream.'
  } else if (isLive) {
    steamHint = "We'll show your account here the moment it links."
  }

  return (
    <div className='rounded-md border border-gray-700 bg-gray-900/40 p-4 space-y-3'>
      <StatusRow
        label='Stream'
        value={isLive ? 'Live' : 'Offline'}
        tone={isLive ? 'good' : 'warn'}
        hint={isLive ? undefined : 'Start streaming first; Steam can only link during a broadcast.'}
      />
      <StatusRow
        label='Steam'
        value={linked ? `Connected${accountName ? ` as ${accountName}` : ''}` : 'Not connected'}
        tone={linked ? 'good' : 'neutral'}
        hint={steamHint}
      />
    </div>
  )
}

const TONE_COLOR = { good: 'success', warn: 'warning', neutral: 'default' } as const

const StatusRow = ({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string
  tone: 'good' | 'warn' | 'neutral'
  hint?: string
}) => {
  return (
    <div>
      <div className='flex items-center justify-between'>
        <span className='text-sm text-gray-400'>{label}</span>
        <Tag
          color={TONE_COLOR[tone]}
          icon={tone === 'good' ? <CheckCircleFilled /> : null}
          className='m-0'
        >
          {value}
        </Tag>
      </div>
      {hint && <p className='text-xs text-gray-500 mt-1'>{hint}</p>}
    </div>
  )
}

const TroubleshootingContent = ({ isLive }: { isLive: boolean }) => {
  return (
    <div className='space-y-3 text-sm'>
      {!isLive && (
        <Alert
          type='warning'
          showIcon
          message='Your stream needs to be online for the link to happen.'
        />
      )}
      <p>Two ways to trigger the first connection:</p>
      <ul className='list-disc ml-5 space-y-1 text-gray-400'>
        <li>
          Quick check: demo any hero, then type <Tag>!facet</Tag> in chat to confirm Dotabod sees
          the game.
        </li>
        <li>Skip testing: just play your first match, the link happens during the game.</li>
      </ul>
      <p className='mt-3'>
        Still nothing after a match?{' '}
        <Link href='/dashboard/help' className='underline'>
          Tell us what you saw
        </Link>{' '}
        and we&apos;ll help. The most common cause is the PowerShell installer didn&apos;t complete.
      </p>
    </div>
  )
}

export default ConnectSteam
