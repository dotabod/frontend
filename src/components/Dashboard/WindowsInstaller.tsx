import { ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { Alert, Spin } from 'antd'
import { Steps } from 'antd'
import { getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { type ReactNode, useEffect, useState } from 'react'
import CodeBlock from './CodeBlock'

const { Step } = Steps

const InstallationSteps = ({ currentStep, errorWithoutSuccess }) => {
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
  const [elapsedTime, setElapsedTime] = useState(0)
  const errorWithoutSuccess = error && !success

  useEffect(() => {
    const channel = new BroadcastChannel('port-check')
    const handleMessage = (event) => {
      if (event.data === 'port' && !router.query.port) {
        router.replace('/no-port') // a 404 page
      }
    }

    channel.addEventListener('message', handleMessage)

    if (router.query.port) {
      channel.postMessage('port')
    }

    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [router.query.port, router.replace])

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
        // console.error('Failed to check status:', error)
        // setError(
        //   'Could not connect to the Dotabod installer. Please try again, or reach out on Discord for more help.'
        // )
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
          setCurrentStep(2)
          setSuccess(true)
        } catch (error) {
          setError(
            'Could not install Dotabod. Please try again, or reach out on Discord for more help.'
          )
        } finally {
          setLoading(false)
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
            `http://localhost:${sanitizedPort}/install_status`,
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

        setElapsedTime((prevTime) => prevTime + 1)
      }, 1000)
    }

    return () => {
      clearInterval(interval)
    }
  }, [success, error, sanitizedPort, elapsedTime])

  return (
    <>
      <div className="flex flex-row justify-center pt-4">
        <CodeBlock />
      </div>
      <div className="mb-4">
        <InstallationSteps
          errorWithoutSuccess={errorWithoutSuccess}
          currentStep={currentStep}
        />
      </div>
      {loading && !success && (
        <div className="flex items-center space-x-4">
          <Spin spinning={loading} />
          <span>Waiting to connect to the Dotabod installer...</span>
        </div>
      )}
      {success && (
        <Alert
          className="max-w-2xl"
          message="The Dotabod installer is running!"
          type="success"
          showIcon
        />
      )}
    </>
  )
}

export default WindowsInstaller
