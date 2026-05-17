import Link from 'next/link'

export const PowerShellTroubleshootingContent = () => (
  <div>
    <p>The PowerShell script likely failed. To get unstuck:</p>
    <ol className='mt-2 list-inside list-decimal space-y-1'>
      <li>Confirm your stream was live when you played.</li>
      <li>Screenshot your PowerShell output.</li>
      <li>Note what happened when you ran the script.</li>
      <li>Send these details using the support form below.</li>
    </ol>
  </div>
)

export const PowerShellFailureMessage = () => (
  <div>
    <p className='mb-2'>The PowerShell script may have failed. To troubleshoot:</p>
    <ol className='mt-2 list-inside list-decimal space-y-1'>
      <li>Confirm your stream was live when you played.</li>
      <li>Screenshot your PowerShell output.</li>
      <li>Contact support with those details.</li>
    </ol>
  </div>
)

export const PowerShellSetupStep = () => (
  <span>
    <strong>Confirm you finished setup</strong>
    <div className='mt-1 text-sm'>
      Did you run the PowerShell script from{' '}
      <Link href='/dashboard?step=2'>Dashboard Setup (Step 2)</Link>? If not, finish setup first.
    </div>
  </span>
)
