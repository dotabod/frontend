import { useFeatureAccess } from '@/hooks/useSubscription'
import { useTrack } from '@/lib/track'
import { FeatureWrapper } from '@/ui/card'
import {
  ExclamationCircleOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { Alert, Steps } from 'antd'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type ReactNode, useEffect, useState } from 'react'
import CodeBlock from './CodeBlock'

const { Step } = Steps

const InstallationSteps = ({ success, currentStep, errorWithoutSuccess }) => {
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

  // Status check effect
  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkStatus = async () => {
      if (!hasAccess || success || error || !sanitizedPort) return

      try {
        const response = await fetch(`http://localhost:${sanitizedPort}/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.ok) {
          track('setup/installer_check_success')
          await fetchToken()
          setError(null)
          clearInterval(interval)
        }
      } catch (err) {
        // Silent fail - we'll retry
      }
    }

    const fetchToken = async () => {
      if (!session?.data?.user?.id) return

      try {
        const response = await fetch(
          `http://localhost:${sanitizedPort}/token?token=${encodeURIComponent(session.data.user.id)}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } },
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
      } catch (err) {
        // Silent fail - we'll retry
      }
    }

    if (hasAccess && !success && !error && sanitizedPort) {
      interval = setInterval(checkStatus, 3000)
    }

    return () => {
      clearInterval(interval)
    }
  }, [success, error, sanitizedPort, session?.data?.user?.id, hasAccess, track])

  return (
    <FeatureWrapper feature='autoInstaller'>
      <p>
        <b>Why?</b> This step is necessary to ensure that Dota 2 knows which data Dotabod requires.
        It&apos;s a Valve approved way of getting game data.
      </p>
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
      {success && (
        <Alert
          className='max-w-2xl'
          message='The Dotabod installer is running! You can continue on to the next step.'
          type='success'
          showIcon
        />
      )}
      <p className='space-x-2'>
        <QuestionCircleOutlined />
        <span>
          Having trouble? Let us know what happened{' '}
          <Link href='/dashboard/help'>from the help page</Link>, and then try{' '}
          <Link onClick={() => track('setup/manual_steps')} href='/dashboard?step=2&gsiType=manual'>
            the manual steps
          </Link>
          .
        </span>
      </p>
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
