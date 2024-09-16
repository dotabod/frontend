import {
  ExclamationCircleOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { sendGAEvent } from '@next/third-parties/google'
import { track } from '@vercel/analytics/react'
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
      title: !errorWithoutSuccess
        ? 'Connection check'
        : 'Connection check failed',
      description: errorWithoutSuccess ? (
        'Please try again or reach out on Discord for more help.'
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
              className="w-full h-auto max-w-3xl rounded-lg"
            >
              <source
                src="/images/setup/how-to-automated-install.mp4"
                type="video/mp4"
              />
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
    icon = (
      <ExclamationCircleOutlined style={{ color: 'var(--color-red-500)' }} />
    )
  }

  return (
    <Steps direction="vertical" current={currentStep}>
      {steps.map((step, index) => (
        <Step
          key={index}
          title={step.title}
          description={step.description}
          icon={
            currentStep === index && icon ? (
              icon
            ) : currentStep === index ? (
              <LoadingOutlined />
            ) : null
          }
          status={
            currentStep > index
              ? 'finish'
              : currentStep === index
                ? 'process'
                : 'wait'
          }
        />
      ))}
    </Steps>
  )
}

const WindowsInstaller = () => {
  const router = useRouter()
  const session = useSession()
  const port = Number.parseInt(router.query.port as string, 10)
  const sanitizedPort = Number.isNaN(port)
    ? 8089
    : Math.min(Math.max(port, 8000), 9000)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const errorWithoutSuccess = error && !success

  useEffect(() => {
    const channel = new BroadcastChannel('single-instance-check')
    const handleMessage = (event) => {
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
  }, [router.replace])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (!success && !error && sanitizedPort) {
      const fetchToken = async () => {
        try {
          const response = await fetch(
            `http://localhost:${sanitizedPort}/token?token=${encodeURIComponent(session.data?.user.id)}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          )
          if (!response.ok) {
            throw new Error('Network response was not ok')
          }
          setCurrentStep(2)
          setSuccess(true)
          setTimeout(() => {
            setCurrentStep(3)
            track('setup/installer_success')
            sendGAEvent({
              action: 'click',
              category: 'install',
              label: 'windows_installer_success',
            })
          }, 3000)
        } catch (error) {
          // Do nothing
        }
      }

      interval = setInterval(async () => {
        try {
          const response = await fetch(
            `http://localhost:${sanitizedPort}/status`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          )
          if (response.ok) {
            fetchToken()
            setError(null)
            track('setup/installer_check_success')
            sendGAEvent({
              action: 'click',
              category: 'install',
              label: 'windows_installer_check_success',
            })
            clearInterval(interval)
          }
        } catch (err) {
          // Do nothing
          // console.error('Failed to check install status:', err)
        }
      }, 3000)
    }
    return () => {
      clearInterval(interval)
    }
  }, [success, error, sanitizedPort, session?.data?.user?.id])

  return (
    <>
      <p>
        <b>Why?</b> This step is necessary to ensure that Dota 2 knows which
        data Dotabod requires. It&apos;s a Valve approved way of getting game
        data.
      </p>
      <div className="flex flex-row justify-center pt-4">
        <CodeBlock />
      </div>
      <div className="mb-4">
        <InstallationSteps
          success={success}
          errorWithoutSuccess={errorWithoutSuccess}
          currentStep={currentStep}
        />
      </div>
      {success && (
        <Alert
          className="max-w-2xl"
          message="The Dotabod installer is running! You can continue on to the next step."
          type="success"
          showIcon
        />
      )}
      <p className="space-x-2">
        <QuestionCircleOutlined />
        <span>
          Having trouble? Let us know what happened{' '}
          <Link
            target="_blank"
            href="https://help.dotabod.com"
            onClick={() => {
              track('setup/help_discord')
              sendGAEvent({
                action: 'click',
                category: 'setup',
                label: 'help_discord',
              })
            }}
          >
            on Discord
          </Link>
          , and then try{' '}
          <Link
            onClick={() => {
              track('setup/manual_steps')
              sendGAEvent({
                action: 'click',
                category: 'setup',
                label: 'manual_steps',
              })
            }}
            href="/dashboard?step=2&gsiType=manual"
          >
            the manual steps
          </Link>
          .
        </span>
      </p>
      {error && (
        <Alert
          className="max-w-2xl"
          message={`An error occurred: ${error}`}
          type="error"
          showIcon
        />
      )}
    </>
  )
}

export default WindowsInstaller
