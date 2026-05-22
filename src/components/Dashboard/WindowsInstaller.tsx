import {
  ExclamationCircleOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { Alert, Steps, Typography } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { type ReactNode, useEffect, useState } from 'react'
import { useFeatureAccess } from '@/hooks/useSubscription'
import {
  buildLocalFetchOptions,
  type LnaPermissionState,
  queryLnaPermission,
  shouldCheckLna,
} from '@/lib/lna'
import { useTrack } from '@/lib/track'
import { FeatureWrapper } from '@/ui/card'
import CodeBlock from './CodeBlock'

const { Step } = Steps

type InstallationStepsProps = {
  success: boolean
  currentStep: number
  errorWithoutSuccess: string | boolean | null
}

const InstallationSteps = ({
  success: _success,
  currentStep,
  errorWithoutSuccess,
}: InstallationStepsProps) => {
  const steps = [
    {
      title: !errorWithoutSuccess ? 'Connection check' : 'Connection check failed',
      description: errorWithoutSuccess ? (
        <span>
          Please try again or reach out from the <Link href='/dashboard/help'>help page</Link> for
          more help.
        </span>
      ) : (
        <div>
          <div>Run the script above to connect to the Dotabod installer!</div>
          {currentStep === 0 && (
            <video
              controls
              autoPlay
              muted
              loop
              playsInline
              className='w-full h-auto max-w-3xl rounded-lg'
            >
              <source src='/images/setup/how-to-automated-install.mp4' type='video/mp4' />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      ),
    },
    {
      title: 'Process Token',
      description: 'Processing the provided token...',
    },
    {
      title: 'Install Dotabod',
      description: 'Running the installer script',
    },
  ]

  let icon: ReactNode = null

  if (errorWithoutSuccess) {
    icon = <ExclamationCircleOutlined style={{ color: 'var(--color-red-500)' }} />
  }

  return (
    <Steps direction='vertical' current={currentStep}>
      {steps.map((step, index) => (
        <Step
          key={step.title}
          title={step.title}
          description={step.description}
          icon={
            currentStep === index && icon ? (
              icon
            ) : currentStep === index ? (
              <LoadingOutlined />
            ) : null
          }
          status={currentStep > index ? 'finish' : currentStep === index ? 'process' : 'wait'}
        />
      ))}
    </Steps>
  )
}

const WindowsInstaller = () => {
  const { hasAccess } = useFeatureAccess('autoInstaller')
  const track = useTrack()
  const router = useRouter()
  const session = useSession()
  const port = Number.parseInt(router.query.port as string, 10)
  const sanitizedPort = Number.isNaN(port) ? 8089 : Math.min(Math.max(port, 8000), 9000)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [lnaPermissionState, setLnaPermissionState] = useState<LnaPermissionState | null>(null)
  const [lnaChecked, setLnaChecked] = useState(false)
  const errorWithoutSuccess = error && !success

  // Single instance check effect
  useEffect(() => {
    const channel = new BroadcastChannel('single-instance-check')
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'instance-opened') {
        router.replace('/404')
      }
    }

    channel.addEventListener('message', handleMessage)
    // Post a message as soon as the component mounts,
    // indicating that an instance has been opened.
    channel.postMessage('instance-opened')

    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [router])

  // Check LNA permission state on mount
  useEffect(() => {
    const checkLnaPermission = async () => {
      if (!shouldCheckLna()) {
        setLnaChecked(true)
        return
      }

      try {
        const state = await queryLnaPermission()
        setLnaPermissionState(state)
        setLnaChecked(true)

        // Track permission state for monitoring
        if (state === 'granted') {
          track('lna/status_granted')
        } else if (state === 'denied') {
          track('lna/status_denied')
        } else if (state === 'prompt') {
          track('lna/status_prompt_shown')
        }
      } catch (_err) {
        // If permission query fails, treat as unsupported
        setLnaPermissionState('unsupported')
        setLnaChecked(true)
      }
    }

    checkLnaPermission()
  }, [track])

  // Status check effect
  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkStatus = async () => {
      if (!hasAccess || success || error || !sanitizedPort) return

      // Don't proceed if LNA permission was denied
      if (lnaPermissionState === 'denied') {
        return
      }

      try {
        const response = await fetch(
          `http://localhost:${sanitizedPort}/status`,
          buildLocalFetchOptions(
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            },
            'loopback',
          ),
        )

        if (response.ok) {
          track('setup/installer_check_success')
          await fetchToken()
          setError(null)
          clearInterval(interval)
        }
      } catch (_err) {
        // Silent fail - we'll retry
      }
    }

    const fetchToken = async () => {
      if (!session?.data?.user?.id) return

      try {
        const response = await fetch(
          `http://localhost:${sanitizedPort}/token?token=${encodeURIComponent(session.data.user.id)}`,
          buildLocalFetchOptions(
            { method: 'GET', headers: { 'Content-Type': 'application/json' } },
            'loopback',
          ),
        )

        if (!response.ok) {
          throw new Error('Network response was not ok')
        }

        setCurrentStep(2)
        setSuccess(true)
        setTimeout(() => {
          setCurrentStep(3)
          track('setup/installer_success')
        }, 3000)
      } catch (_err) {
        // Silent fail - we'll retry
      }
    }

    // Only start polling if LNA check is complete and permission is not denied
    if (
      hasAccess &&
      !success &&
      !error &&
      sanitizedPort &&
      lnaChecked &&
      lnaPermissionState !== 'denied'
    ) {
      interval = setInterval(checkStatus, 3000)
    }

    return () => {
      clearInterval(interval)
    }
  }, [
    success,
    error,
    sanitizedPort,
    session?.data?.user?.id,
    hasAccess,
    track,
    lnaChecked,
    lnaPermissionState,
  ])

  return (
    <FeatureWrapper feature='autoInstaller'>
      <div className='mb-4 space-y-2'>
        <p>
          Run this command to install Dota 2&apos;s Game State Integration config. The script is
          short, the source is{' '}
          <Link
            target='_blank'
            href='https://github.com/dotabod/frontend/blob/master/src/lib/private/install.ps1'
          >
            public on GitHub
          </Link>
          , and here&apos;s what it does on your computer:
        </p>
        <ul className='ml-4 list-disc text-sm text-gray-400 space-y-1'>
          <li>Opens a local page in your browser so this account can authenticate the install</li>
          <li>
            Writes one config file into your Dota 2 folder (the file Valve provides for streamer
            integrations)
          </li>
          <li>
            Adds the <Typography.Text code>-gamestateintegration</Typography.Text> launch option to
            Dota 2, then exits
          </li>
        </ul>
      </div>
      <div className='flex flex-row justify-center pt-4'>
        <CodeBlock />
      </div>
      <div className='mb-4'>
        <InstallationSteps
          success={success}
          errorWithoutSuccess={errorWithoutSuccess}
          currentStep={currentStep}
        />
      </div>
      {lnaChecked && lnaPermissionState === 'denied' && (
        <Alert
          className='max-w-2xl mb-4'
          message='Browser blocked the installer connection'
          description={
            <span>
              The Dotabod installer runs on your own computer, and your browser needs permission to
              talk to it. Allow local network access in your browser settings and refresh this page,
              or use the manual steps below instead.{' '}
              <Link href='/dashboard/help'>How to fix this</Link>.
            </span>
          }
          type='error'
          showIcon
        />
      )}
      {lnaChecked && lnaPermissionState === 'prompt' && !success && (
        <Alert
          className='max-w-2xl mb-4'
          message="When your browser asks, click 'Allow'"
          description='Your browser needs one-time permission to connect to the installer running on your computer. Without it, the install will silently fail.'
          type='info'
          showIcon
        />
      )}
      {success && (
        <Alert
          className='max-w-2xl'
          message='Config installed. Continue to the next step.'
          type='success'
          showIcon
        />
      )}
      {!success && (
        <p className='mt-4 text-sm text-gray-400 flex items-start gap-2 max-w-2xl'>
          <QuestionCircleOutlined className='mt-0.5 shrink-0' />
          <span>
            Script not working? Use{' '}
            <Link
              onClick={() => track('setup/manual_steps')}
              href='/dashboard?step=2&gsiType=manual'
            >
              the manual install
            </Link>{' '}
            instead, or <Link href='/dashboard/help'>tell us what you saw</Link>.
          </span>
        </p>
      )}
      {error && (
        <Alert
          className='max-w-2xl'
          message={`An error occurred: ${error}`}
          type='error'
          showIcon
        />
      )}
    </FeatureWrapper>
  )
}

export default WindowsInstaller
