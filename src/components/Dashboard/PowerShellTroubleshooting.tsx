import { Alert, Tag } from 'antd'
import Link from 'next/link'

export const LiveRequiredNote = () => (
  <Alert
    type='warning'
    showIcon
    message='Steam only connects while your stream is live'
    description='You need to be live on Twitch the first time Steam connects. After that, every future match works automatically, even offline.'
  />
)

export const CfgLocationNote = () => (
  <span>
    The cfg file belongs in <Tag>/gamestate_integration/</Tag>, not <Tag>/cfg/</Tag>. Restart Dota
    after moving it.
  </span>
)

export const PowerShellFailureSteps = ({
  lastStep = 'Send these details using the support form below.',
}: {
  lastStep?: string
}) => (
  <div>
    <p>
      The one-time PowerShell script may not have finished. You only run it once, during setup, and
      it works offline. To get unstuck:
    </p>
    <ol className='mt-2 list-inside list-decimal space-y-1'>
      <li>
        Re-run the script from <Link href='/dashboard?step=2'>Dashboard Setup (Step 2)</Link>.
      </li>
      <li>Screenshot your PowerShell output.</li>
      <li>Note what happened when you ran the script.</li>
      <li>{lastStep}</li>
    </ol>
  </div>
)

export const PowerShellSetupStep = () => (
  <span>
    <strong>Confirm you finished setup</strong>
    <div className='mt-1 text-sm'>
      Did you run the PowerShell script from{' '}
      <Link href='/dashboard?step=2'>Dashboard Setup (Step 2)</Link>? It's a one-time setup step and
      can be run offline. If you haven't run it, finish setup first.
    </div>
  </span>
)
