import Link from 'next/link'

export const PowerShellTroubleshootingContent = () => (
  <div>
    <p>Your PowerShell script likely failed. To get help:</p>
    <ol className='mt-2 list-inside list-decimal space-y-1'>
      <li>Confirm your stream was online when you played</li>
      <li>Take a screenshot of your PowerShell output</li>
      <li>Describe what happened when you ran the script</li>
      <li>Use the form below to contact support with these details</li>
    </ol>
  </div>
)

export const PowerShellFailureMessage = () => (
  <div>
    <p className='mb-2'>Your PowerShell script may have failed. To troubleshoot:</p>
    <ol className='mt-2 list-inside list-decimal space-y-1'>
      <li>Confirm your stream was online when you played</li>
      <li>Take a screenshot of your PowerShell output</li>
      <li>Contact support with details about what happened</li>
    </ol>
  </div>
)

export const PowerShellSetupStep = () => (
  <span>
    <strong>Check if you completed setup</strong>
    <div className='mt-1 text-sm'>
      Did you run the PowerShell script from{' '}
      <Link href='/dashboard?step=2'>Dashboard Setup (Step 2)</Link>? If not, complete setup first.
    </div>
  </span>
)
