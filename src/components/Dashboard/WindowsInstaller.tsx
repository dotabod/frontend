import { ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { Alert } from 'antd'
import { Steps } from 'antd'
import { getSession } from 'next-auth/react'
import Image from 'next/image'
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
      description: errorWithoutSuccess
        ? 'Please try again or reach out on Discord for more help.'
        : 'Run the script above to connect to the Dotabod installer!',
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
  const port = Number.parseInt(router.query.port as string, 10)
  const sanitizedPort = Number.isNaN(port)
    ? 8089
    : Math.min(Math.max(port, 8000), 9000)
  const [loading, setLoading] = useState(true)
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
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:${sanitizedPort}/status`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        )
        if (!response.ok) {
          throw new Error('Status check failed')
        }
        setCurrentStep(1)
        return true
      } catch (error) {
        return false
      }
    }

    const fetchToken = async () => {
      setLoading(true)
      const session = await getSession()
      if (session) {
        const token = session.user.id
        try {
          const statusOk = await checkStatus()
          if (!statusOk) return

          const response = await fetch(
            `http://localhost:${sanitizedPort}/token?token=${encodeURIComponent(token)}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          )
          if (!response.ok) {
            throw new Error('Network response was not ok')
          }
          setLoading(false)
          setCurrentStep(2)
          setSuccess(true)
          setTimeout(() => {
            setCurrentStep(3)
          }, 3000)
        } catch (error) {
          // Do nothing
        }
      }
    }

    fetchToken()
  }, [sanitizedPort])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (!success && !error && sanitizedPort) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(
            `http://localhost:${sanitizedPort}/status`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          )
          if (response.ok) {
            setCurrentStep(3)
            setSuccess(true)
            setError(null)
            clearInterval(interval)
          }
        } catch (err) {
          console.error('Failed to check install status:', err)
        }
      }, 3000)
    }
    return () => {
      clearInterval(interval)
    }
  }, [success, error, sanitizedPort])

  return (
    <>
      <div className="mb-4 space-x-2">
        <span>
          <b>Why?</b> This step is necessary to ensure that Dota 2 knows which
          data Dotabod requires. It&apos;s a Valve approved way of getting game
          data.
        </span>
        <Image
          className="inline"
          alt="ok emote"
          unoptimized
          src="https://cdn.7tv.app/emote/6268904f4f54759b7184fa72/1x.webp"
          width={28}
          height={28}
        />
      </div>
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
